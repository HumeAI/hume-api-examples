import {
  Hume,
  HumeClient,
  convertBlobToBase64,
  ensureSingleValidAudioTrack,
  getAudioStream,
  getBrowserSupportedMimeType,
  EVIWebAudioPlayer,
  MimeType,
} from 'hume';
import { handleToolCallMessage } from './handleToolCall';
import './styles.css';

(async () => {
  const startBtn =
    document.querySelector<HTMLButtonElement>("button#start-btn");
  const stopBtn = document.querySelector<HTMLButtonElement>("button#stop-btn");
  const chat = document.querySelector<HTMLDivElement>("div#chat");

  startBtn?.addEventListener("click", connect);
  stopBtn?.addEventListener("click", disconnect);

  /**
   * the Hume Client, includes methods for connecting to EVI and managing the Web Socket connection
   */
  let client: HumeClient | null = null;

  /**
   * the WebSocket instance
   */
  let socket: Hume.empathicVoice.chat.ChatSocket | null = null;

  /**
   * flag which denotes the intended state of the WebSocket
   */
  let connected = false;

  /**
   * the recorder responsible for recording the audio stream to be prepared as the audio input
   */
  let recorder: MediaRecorder | null = null;

  /**
   * the stream of audio captured from the user's microphone
   */
  let audioStream: MediaStream | null = null;

  /**
   * the audio player for handling audio output from EVI
   */
  let player = new EVIWebAudioPlayer();

  /**
   * flag which denotes whether to utilize chat resumability (preserve context from one chat to the next)
   */
  let resumeChats = true;

  /**
   * The ChatGroup ID used to resume the chat if disconnected unexpectedly
   */
  let chatGroupId: string | undefined;

  /**
   * mime type supported by the browser the application is running in
   */
  const mimeType: MimeType = (() => {
    const result = getBrowserSupportedMimeType();
    return result.success ? result.mimeType : MimeType.WEBM;
  })();

  /**
   * instantiates interface config and client, sets up Web Socket handlers, and establishes secure Web Socket connection
   */
  async function connect(): Promise<void> {
    // instantiate the HumeClient with credentials to make authenticated requests
    if (!client) {
      client = new HumeClient({
        apiKey: import.meta.env.VITE_HUME_API_KEY || "",
      });
    }

    // instantiates WebSocket and establishes an authenticated connection
    socket = client.empathicVoice.chat.connect({
      // configuration that includes the get_current_weather tool
      configId: import.meta.env.VITE_HUME_WEATHER_ASSISTANT_CONFIG_ID || null,
      resumedChatGroupId: chatGroupId,
    });

    socket.on("open", handleWebSocketOpenEvent);
    socket.on("message", handleWebSocketMessageEvent);
    socket.on("error", handleWebSocketErrorEvent);
    socket.on("close", handleWebSocketCloseEvent);

    // update ui state
    toggleBtnStates();
  }

  /**
   * stops audio capture and playback, and closes the Web Socket connection
   */
  function disconnect(): void {
    // update ui state
    toggleBtnStates();

    // stop audio playback
    player.stop();

    // stop audio capture
    recorder?.stream.getTracks().forEach((t) => t.stop());
    recorder = null;
    audioStream = null;

    // set connected state to false to prevent automatic reconnect
    connected = false;

    // IF resumeChats flag is false, reset chatGroupId so a new conversation is started when reconnecting
    if (!resumeChats) {
      chatGroupId = undefined;
    }

    // dispose of player resources
    player.dispose();

    // closed the Web Socket connection
    socket?.close();
  }

  /**
   * captures and records audio stream, and sends audio stream through the socket
   *
   * API Reference:
   * - `audio_input`: https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#send.Audio%20Input.type
   */
  async function captureAudio(): Promise<void> {
    audioStream = await getAudioStream();
    // ensure there is only one audio track in the stream
    ensureSingleValidAudioTrack(audioStream);

    // instantiate the media recorder
    recorder = new MediaRecorder(audioStream, { mimeType });

    // callback for when recorded chunk is available to be processed
    recorder.ondataavailable = async ({ data }) => {
      // IF size of data is smaller than 1 byte then do nothing
      if (data.size < 1) return;

      // base64 encode audio data
      const encodedAudioData = await convertBlobToBase64(data);

      // define the audio_input message JSON
      const audioInput: Omit<Hume.empathicVoice.AudioInput, "type"> = {
        data: encodedAudioData,
      };

      // send audio_input message
      socket?.sendAudioInput(audioInput);
    };

    // capture audio input at a rate of 100ms (recommended)
    const timeSlice = 100;
    recorder.start(timeSlice);
  }


  /**
   * callback function to handle a WebSocket opened event
   */
  async function handleWebSocketOpenEvent(): Promise<void> {
    /* place logic here which you would like invoked when the socket opens */
    console.log("Web socket connection opened");

    // ensures socket will reconnect if disconnected unintentionally
    connected = true;

    // initialize the audio player
    await player.init();

    await captureAudio();
  }

  /**
   * callback function to handle a WebSocket message event
   *
   * API Reference:
   * - `chat_metadata`: https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#receive.Chat%20Metadata.type
   * - `user_message`: https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#receive.User%20Message.type
   * - `assistant_message`: https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#receive.Assistant%20Message.type
   * - `audio_output`: https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#receive.Audio%20Output.type
   * - `user_interruption`: https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#receive.User%20Interruption.type
   * - `tool_call`: https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#receive.Tool%20Call%20Message.type
   */
  async function handleWebSocketMessageEvent(
    message: Hume.empathicVoice.SubscribeEvent
  ): Promise<void> {
    /* place logic here which you would like to invoke when receiving a message through the socket */
    console.log(message);

    // handle messages received through the WebSocket (messages are distinguished by their "type" field.)
    switch (message.type) {
      // save chat_group_id to resume chat if disconnected
      case "chat_metadata":
        chatGroupId = message.chatGroupId;
        break;

      // append user and assistant messages to UI for chat visibility
      case "user_message":
      case "assistant_message":
        if (message.type === "user_message") {
          player.stop();
        }
        const { role, content } = message.message;
        const topThreeEmotions = extractTopThreeEmotions(message);
        appendMessage(role, content ?? "", topThreeEmotions);
        break;

      // enqueue received audio for playback
      case "audio_output":
        await player.enqueue(message);
        break;

      // stop audio playback on user interruption
      case "user_interruption":
        player.stop();
        break;

      // invoke tool upon receiving a tool_call message
      case "tool_call":
        handleToolCallMessage(message, socket);
        break;
    }
  }

  /**
   * callback function to handle a WebSocket error event
   */
  function handleWebSocketErrorEvent(error: Error): void {
    /* place logic here which you would like invoked when receiving an error through the socket */
    console.error(error);
  }

  /**
   * callback function to handle a WebSocket closed event
   */
  async function handleWebSocketCloseEvent(): Promise<void> {
    /* place logic here which you would like invoked when the socket closes */

    // reconnect to the socket if disconnect was unintentional
    if (connected) await connect();

    console.log("Web socket connection closed");
  }

  /**
   * adds message to Chat in the webpage's UI
   *
   * @param role the speaker associated with the audio transcription
   * @param content transcript of the audio
   * @param topThreeEmotions the top three emotion prediction scores for the message
   */
  function appendMessage(
    role: Hume.empathicVoice.Role,
    content: string,
    topThreeEmotions: { emotion: string; score: any }[]
  ): void {
    // generate chat card component with message content and emotion scores
    const chatCard = new ChatCard({
      role,
      timestamp: new Date().toLocaleTimeString(),
      content,
      scores: topThreeEmotions,
    });

    // append chat card to the UI
    chat?.appendChild(chatCard.render());

    // scroll to the bottom to view most recently added message
    if (chat) chat.scrollTop = chat.scrollHeight;
  }

  /**
   * toggles `start` and `stop` buttons' disabled states
   */
  function toggleBtnStates(): void {
    if (startBtn) startBtn.disabled = !startBtn.disabled;
    if (stopBtn) stopBtn.disabled = !stopBtn.disabled;
  }

  /**
   * takes a received `user_message` or `assistant_message` and extracts the top 3 emotions from the
   * predicted expression measurement scores.
   */
  function extractTopThreeEmotions(
    message:
      | Hume.empathicVoice.UserMessage
      | Hume.empathicVoice.AssistantMessage
  ): { emotion: string; score: string }[] {
    // extract emotion scores from the message
    const scores = message.models.prosody?.scores;

    // convert the emotions object into an array of key-value pairs
    const scoresArray = Object.entries(scores || {});

    // sort the array by the values in descending order
    scoresArray.sort((a, b) => b[1] - a[1]);

    // extract the top three emotions and convert them back to an object
    const topThreeEmotions = scoresArray
      .slice(0, 3)
      .map(([emotion, score]) => ({
        emotion,
        score: (Math.round(Number(score) * 100) / 100).toFixed(2),
      }));

    return topThreeEmotions;
  }
})();

/**
 * The code below does not pertain to the EVI implementation, and only serves to style the UI.
 */

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
    role.textContent =
      this.message.role.charAt(0).toUpperCase() + this.message.role.slice(1);

    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.innerHTML = `<strong>${this.message.timestamp}</strong>`;

    const content = document.createElement('div');
    content.className = 'content';
    content.textContent = this.message.content;

    const scores = document.createElement('div');
    scores.className = 'scores';
    this.message.scores.forEach((score) => {
      scores.appendChild(this.createScoreItem(score));
    });

    card.appendChild(role);
    card.appendChild(timestamp);
    card.appendChild(content);
    card.appendChild(scores);

    return card;
  }
}
