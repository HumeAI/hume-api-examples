import {
  Hume,
  HumeClient,
  convertBlobToBase64,
  convertBase64ToBlob,
  ensureSingleValidAudioTrack,
  getAudioStream,
  getBrowserSupportedMimeType,
  MimeType,
} from 'hume';
import { CloseEvent as HumeCloseEvent } from 'hume/core/websocket/events';
import './styles.css';

const RECONNECT_DELAY_MS = 3000; // Delay before attempting reconnection after unexpected closure
const TIME_SLICE_MS = 50; // Audio buffer duration for streamed audio
const ABNORMAL_CLOSE_CODES = new Set([1006, 1011, 1012, 1013, 1014]); // WebSocket close codes for abnormal closures

(async () => {
  const startBtn = document.querySelector<HTMLButtonElement>('button#start-btn');
  const stopBtn = document.querySelector<HTMLButtonElement>('button#stop-btn');
  const chat = document.querySelector<HTMLDivElement>('div#chat');

  startBtn?.addEventListener('click', connect);
  stopBtn?.addEventListener('click', disconnect);

  toggleBtnStates(false);

  /**--- Hume SDK and State ---*/
  let client: HumeClient | null = null;
  let socket: Hume.empathicVoice.chat.ChatSocket | null = null;
  /** ID for resuming chats across connections (if shouldResumeChats is true). */
  let chatGroupId: string | undefined;
  /** Set to true to reuse the same chat context after reconnecting. */
  const shouldResumeChats = true;
  /** Flag indicating if the connection *should* be active (user initiated). Used for reconnection logic. */
  let shouldBeConnected = false;

  /**--- Audio Recording State ---*/
  let recorder: MediaRecorder | null = null;
  let audioStream: MediaStream | null = null;
  const mimeTypeResult = getBrowserSupportedMimeType();
  const mimeType: MimeType = mimeTypeResult.success ? mimeTypeResult.mimeType : MimeType.WEBM;

  /**--- Audio Playback State ---*/
  const audioQueue: Blob[] = [];
  let currentAudio: HTMLAudioElement | null = null;
  let isPlaying = false;

  /**--- Reconnection State ---*/
  let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /** Establishes a connection to the Hume EVI WebSocket API. */
  function connect() {
    if (isConnectingOrConnected()) {
      console.log("Already connecting or connected.");
      return;
    }

    clearReconnectTimer(); // Clear any pending reconnection attempts
    shouldBeConnected = true;
    toggleBtnStates(true); // Update UI immediately to reflect connection attempt

    try {
      // Initialize HumeClient if not yet initialized
      if (!client) {
        /**
         * SECURITY NOTICE: This example uses direct API key authentication for simplicity.
         * For production browser environments, implement the "Token Auth" strategy instead
         * to prevent exposing your API key in client-side code.
         * See: https://dev.hume.ai/docs/introduction/api-key#authentication-strategies
         */
        const apiKey = import.meta.env.VITE_HUME_API_KEY;
        if (!apiKey) throw new Error("VITE_HUME_API_KEY is not set in environment variables.");
        client = new HumeClient({ apiKey });
      }
      const configId = import.meta.env.VITE_HUME_CONFIG_ID;
      if (!configId) console.warn("No Config ID specified, using default EVI configuration settings.");

      // Connect to EVI
      socket = client.empathicVoice.chat.connect({ configId, resumedChatGroupId: chatGroupId });

      // Attach WebSocket event listeners
      socket.on('open', handleWebSocketOpen);
      socket.on('message', handleWebSocketMessage);
      socket.on('error', handleWebSocketError);
      socket.on('close', handleWebSocketClose);

    } catch (error) {
      console.error("Connection failed:", error);
      // Reset state fully on initial connection failure
      shouldBeConnected = false;
      socket = null;
      toggleBtnStates(false);
    }
  }

  /** Gracefully disconnects from the Hume EVI WebSocket API and cleans up resources. */
  function disconnect(): void {
    shouldBeConnected = false; // Mark that the user intended to disconnect
    clearReconnectTimer();
    // Stop audio playback and clear queue
    stopAudioPlayback();
    // Stop recording and release microphone
    stopRecording();
    releaseMicrophoneStream();
    // Reset chat group ID if chats shouldn't be resumed
    if (!shouldResumeChats) {
      chatGroupId = undefined;
      console.log("Chat resume disabled. Resetting chat group ID.");
    }
    // Close the WebSocket connection if it's open or connecting
    if (socket && socket.readyState !== WebSocket.CLOSING && socket.readyState !== WebSocket.CLOSED) {
      socket.close();
    }
    socket = null;
    toggleBtnStates(false);
  }

  /**--- WebSocket Event Handlers ---*/
  /** Handles the WebSocket 'open' event. Starts audio capture. */
  async function handleWebSocketOpen(): Promise<void> {
    console.log('WebSocket connection opened.');
    try {
      await startAudioCapture();
    } catch (error) {
      console.error("Failed to start audio capture after WebSocket open:", error);
      alert("Failed to access microphone. Disconnecting.");
      disconnect(); // Disconnect if we can't capture audio
    }
  }

  /** Handles incoming WebSocket messages. */
  function handleWebSocketMessage(message: Hume.empathicVoice.SubscribeEvent) {
    switch (message.type) {
      case 'chat_metadata':
        // Store chat group ID for potential resumption
        chatGroupId = message.chatGroupId;
        break;
      case 'user_message':
      case 'assistant_message':
        // Stop playback if user starts speaking
        if (message.type === 'user_message') stopAudioPlayback();
        // Display the message in the chat UI
        const { role, content } = message.message;
        const topEmotions = extractTopThreeEmotions(message);
        appendMessageToChat(role, content ?? '', topEmotions);
        break;
      case 'audio_output':
        // Decode and queue audio for playback
        const audioBlob = convertBase64ToBlob(message.data, mimeType);
        audioQueue.push(audioBlob);
        playNextAudioChunk(); // Attempt to play immediately if not already playing
        break;
      case 'user_interruption':
        // Stop playback immediately when the user interrupts
        console.log("User interruption detected.");
        stopAudioPlayback();
        break;
      case 'error':
        // Log errors received from the EVI service
        console.error(`EVI Error: Code=${message.code}, Slug=${message.slug}, Message=${message.message}`);
        break;
    }
  }

  /** Handles WebSocket transport errors. */
  function handleWebSocketError(error: Event | Error): void {
    console.error("WebSocket transport error:", error);
  }

  /** Handles the WebSocket 'close' event. Cleans up and attempts reconnection if needed. */
  function handleWebSocketClose(event: HumeCloseEvent): void {
    console.log('WebSocket connection closed.');
    // Clean up resources regardless of why it closed
    stopRecording();
    releaseMicrophoneStream();
    stopAudioPlayback();
    socket = null;
    // Decide whether to reconnect based on shouldBeConnected flag and close code
    const isAbnormalClosure = ABNORMAL_CLOSE_CODES.has(event.code);
    if (shouldBeConnected && isAbnormalClosure) {
      console.warn(`Unexpected closure (Code: ${event.code}). Attempting to reconnect in ${RECONNECT_DELAY_MS / 1000}s...`);
      scheduleReconnect();
    } else {
      // If it was a normal closure or user intended to disconnect, reset UI to disconnected state
      shouldBeConnected = false;
      if (!shouldResumeChats) chatGroupId = undefined;
      toggleBtnStates(false);
    }
  }

  /**--- Audio Capture Functions ---*/
  /** Initializes microphone access and starts recording. */
  async function startAudioCapture(): Promise<void> {
    try {
      audioStream = await getAudioStream();
      ensureSingleValidAudioTrack(audioStream); // Validate the stream

      recorder = new MediaRecorder(audioStream, { mimeType });
      recorder.ondataavailable = handleAudioDataAvailable;
      recorder.onerror = (event) => console.error("MediaRecorder error:", event);
      recorder.start(TIME_SLICE_MS);
    } catch (error) {
      console.error("Failed to initialize or start audio capture:", error);
      throw error;
    }
  }

  /** Handles available audio data chunks from the MediaRecorder. */
  async function handleAudioDataAvailable(event: BlobEvent): Promise<void> {
    if (event.data.size > 0 && socket && socket.readyState === WebSocket.OPEN) {
      const encodedAudio = await convertBlobToBase64(event.data);
      socket.sendAudioInput({ data: encodedAudio });
    }
  }

  /** Stops the MediaRecorder if it's active. */
  function stopRecording(): void {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    recorder = null;
  }

  /** Stops the tracks of the microphone audio stream to release the device. */
  function releaseMicrophoneStream(): void {
    if (audioStream) audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }

  /**--- Audio Playback Functions ---*/
  /** Plays the next audio chunk from the queue if available and not already playing. */
  function playNextAudioChunk(): void {
    // Don't play if already playing or queue is empty
    if (isPlaying || audioQueue.length === 0) return;

    isPlaying = true;
    const audioBlob = audioQueue.shift();

    if (!audioBlob) {
      isPlaying = false;
      return;
    }
    const audioUrl = URL.createObjectURL(audioBlob);
    currentAudio = new Audio(audioUrl);
    currentAudio.play();
    currentAudio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      isPlaying = false;
      playNextAudioChunk(); // Recursively play the next chunk if queue is not empty
    };
  }

  /** Stops the currently playing audio and clears the playback queue. */
  function stopAudioPlayback(): void {
    if (currentAudio) {
      currentAudio.pause();
      console.log("Audio playback paused.");
      if (currentAudio.src && currentAudio.src.startsWith('blob:')) {
        URL.revokeObjectURL(currentAudio.src); // Revoke URL if paused mid-play
      }
      currentAudio = null;
    }
    audioQueue.length = 0; // Clear the queue
    isPlaying = false; // Reset playback state
  }

  /**--- UI and Helper Functions ---*/
  /** Appends a message (user or assistant) to the chat UI. */
  function appendMessageToChat(
    role: Hume.empathicVoice.Role,
    content: string,
    topEmotions: { emotion: string; score: string }[]
  ): void {
    if (!chat) return;
    const chatCard = new ChatCard({
      role,
      timestamp: new Date().toLocaleTimeString(),
      content,
      scores: topEmotions,
    });
    chat.appendChild(chatCard.render());
    chat.scrollTop = chat.scrollHeight; // Auto-scroll to the bottom
  }

  /** Extracts and formats the top 3 emotion scores from a message. */
  function extractTopThreeEmotions(
    message: Hume.empathicVoice.UserMessage | Hume.empathicVoice.AssistantMessage
  ): { emotion: string; score: string }[] {
    // Extract emotion scores from the message
    const scores = message.models.prosody?.scores;
    // Convert the emotions object into an array of key-value pairs
    const scoresArray = Object.entries(scores || {});
    // Sort the array by the values in descending order
    scoresArray.sort((a, b) => b[1] - a[1]);
    // Extract the top three emotions and convert them back to an object
    const topThreeEmotions = scoresArray.slice(0, 3).map(([emotion, score]) => ({
      emotion,
      score: Number(score).toFixed(2),
    }));
    return topThreeEmotions;
  }

  /** Updates the enabled/disabled state of the start/stop buttons. */
  function toggleBtnStates(isConnectedOrConnecting: boolean): void {
    if (startBtn) startBtn.disabled = isConnectedOrConnecting;
    if (stopBtn) stopBtn.disabled = !isConnectedOrConnecting;
  }

  /** Checks if the socket is currently connecting or already open. */
  function isConnectingOrConnected(): boolean {
    return socket?.readyState === WebSocket.CONNECTING || socket?.readyState === WebSocket.OPEN;
  }

  /**--- Reconnection Logic ---*/
  /** Schedules a reconnection attempt after a delay. */
  function scheduleReconnect(): void {
    clearReconnectTimer(); // Ensure no duplicate timers
    reconnectTimeoutId = setTimeout(() => {
      if (shouldBeConnected) { // Double-check if still intended before reconnecting
        console.log("Attempting reconnect now...");
        connect(); // No 'await' needed, runs async
      }
    }, RECONNECT_DELAY_MS);
  }

  /** Clears any pending reconnection timer. */
  function clearReconnectTimer(): void {
    if (!reconnectTimeoutId) return;
    clearTimeout(reconnectTimeoutId);
    reconnectTimeoutId = null;
  }
})();

/** The code below does not pertain to the EVI implementation, and only serves to style the UI. */

interface Score {
  emotion: string;
  score: string;
}

interface ChatMessage {
  role: Hume.empathicVoice.Role;
  timestamp: string;
  content: string;
  scores: Score[];
}

class ChatCard {
  private message: ChatMessage;

  constructor(message: ChatMessage) {
    this.message = message;
  }

  private createScoreItem(score: Score): HTMLElement {
    const scoreItem = document.createElement('div');
    scoreItem.className = 'score-item';
    scoreItem.innerHTML = `${score.emotion}: <strong>${score.score}</strong>`;
    return scoreItem;
  }

  public render(): HTMLElement {
    const card = document.createElement('div');
    card.className = `chat-card ${this.message.role}`;

    const role = document.createElement('div');
    role.className = 'role';
    role.textContent = this.message.role.charAt(0).toUpperCase() + this.message.role.slice(1);

    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.innerHTML = `<strong>${this.message.timestamp}</strong>`;

    const content = document.createElement('div');
    content.className = 'content';
    content.textContent = this.message.content;

    const scores = document.createElement('div');
    scores.className = 'scores';
    this.message.scores.forEach((score) => scores.appendChild(this.createScoreItem(score)));

    card.appendChild(role);
    card.appendChild(timestamp);
    card.appendChild(content);
    card.appendChild(scores);

    return card;
  }
}
