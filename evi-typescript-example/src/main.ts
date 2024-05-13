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

/**
 * type safe getElement utility function
 *
 * @param id safe getElement utility function
 * @returns the HTML element if found
 */
function getElementById<T extends HTMLElement>(id: string): T | null {
  const element = document.getElementById(id);
  return element as T | null;
}

(async () => {
  const startBtn = getElementById<HTMLButtonElement>('start-btn');
  const stopBtn = getElementById<HTMLButtonElement>('stop-btn');
  const chat = getElementById<HTMLDivElement>('chat');

  startBtn?.addEventListener('click', connect);
  stopBtn?.addEventListener('click', disconnect);

  /**
   * the Hume Client, includes methods for connecting to EVI and managing the Web Socket connection
   */
  let client: HumeClient | null = null;

  /**
   * the WebSocket instance
   */
  let socket: Hume.empathicVoice.StreamSocket | null = null;

  /**
   * the recorder responsible for recording the audio stream to be prepared as the audio input
   */
  let recorder: MediaRecorder | null = null;

  /**
   * the stream of audio captured from the user's microphone
   */
  let audioStream: MediaStream | null = null;

  /**
   * the current audio element to be played
   */
  let currentAudio: HTMLAudioElement | null = null;

  /**
   * flag which denotes whether audio is currently playing or not
   */
  let isPlaying = false;

  /**
   * audio playback queue
   */
  const audioQueue: Blob[] = [];

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
        apiKey: import.meta.env.VITE_HUME_API_KEY || '',
        clientSecret: import.meta.env.VITE_HUME_CLIENT_SECRET || '',
      });
    }

    // instantiates WebSocket and establishes an authenticated connection
    socket = await client.empathicVoice.chat.connect({
      onOpen: handleWebSocketOpenEvent,
      onMessage: handleWebSocketMessageEvent,
      onError: handleWebSocketErrorEvent,
      onClose: handleWebSocketCloseEvent,
    });

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
    stopAudio();

    // stop audio capture
    recorder?.stop();
    recorder = null;
    audioStream = null;

    // closed the Web Socket connection
    socket?.close();

    // adds "conversation ended" message to the chat
    appendMessage('system', 'Conversation ended.');
  }

  /**
   * captures and records audio stream, and sends audio stream through the socket
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
      const audioInput: Omit<Hume.empathicVoice.AudioInput, 'type'> = {
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
   * play the audio within the playback queue, converting each Blob into playable HTMLAudioElements
   */
  function playAudio(): void {
    // IF there is nothing in the audioQueue OR audio is currently playing then do nothing
    if (!audioQueue.length || isPlaying) return;

    // update isPlaying state
    isPlaying = true;

    // pull next audio output from the queue
    const audioBlob = audioQueue.shift();

    // IF audioBlob is unexpectedly undefined then do nothing
    if (!audioBlob) return;

    // converts Blob to AudioElement for playback
    const audioUrl = URL.createObjectURL(audioBlob);
    currentAudio = new Audio(audioUrl);

    // play audio
    currentAudio.play();

    // callback for when audio finishes playing
    currentAudio.onended = () => {
      // update isPlaying state
      isPlaying = false;

      // attempt to pull next audio output from queue
      if (audioQueue.length) playAudio();
    };
  }

  /**
   * stops audio playback, clears audio playback queue, and updates audio playback state
   */
  function stopAudio(): void {
    // stop the audio playback
    currentAudio?.pause();
    currentAudio = null;

    // update audio playback state
    isPlaying = false;

    // clear the audioQueue
    audioQueue.length = 0;
  }

  /**
   * handles WebSocket open event
   */
  async function handleWebSocketOpenEvent(): Promise<void> {
    // place logic here which you would like invoked when the socket opens
    console.log('Web socket connection opened');
    await captureAudio();
  }

  /**
   * handles WebSocket message event
   */
  function handleWebSocketMessageEvent(
    message: Hume.empathicVoice.SubscribeEvent
  ): void {
    // place logic here which you would like to invoke when receiving a message through the socket
    switch (message.type) {
      // append user and assistant messages to UI for chat visibility
      case 'user_message':
      case 'assistant_message':
        const { role, content } = message.message;
        appendMessage(role, content ?? '');
        break;

      // add received audio to the playback queue, and play next audio output
      case 'audio_output':
        // convert base64 encoded audio to a Blob
        const audioOutput = message.data;
        const blob = convertBase64ToBlob(audioOutput, mimeType);

        // add audio Blob to audioQueue
        audioQueue.push(blob);

        // play the next audio output
        if (audioQueue.length === 1) playAudio();
        break;

      // stop audio playback, clear audio playback queue, and update audio playback state on interrupt
      case 'user_interruption':
        stopAudio();
        break;
    }
  }

  /**
   * handles WebSocket error event
   */
  function handleWebSocketErrorEvent(
    error: Hume.empathicVoice.WebSocketError
  ): void {
    // place logic here which you would like invoked when receiving an error through the socket
    console.error(error);
  }

  /**
   * handles WebSocket close event
   */
  function handleWebSocketCloseEvent(): void {
    // place logic here which you would like invoked when the socket closes
    console.log('Web socket connection closed');
  }

  /**
   * adds message to Chat in the webpage's UI
   *
   * @param role the speaker associated with the audio transcription
   * @param content transcript of the audio
   */
  function appendMessage(role: Hume.empathicVoice.Role, content: string): void {
    // get timestamp for the message
    const timestamp = new Date().toLocaleTimeString();

    // create new message element
    const messageEl = document.createElement('p');

    // construct message with timestamp, role, and message content
    const message = `<strong>[${timestamp}] ${role}:</strong> ${content}`;

    // set message element's inner html to be the newly constructed message
    messageEl.innerHTML = message;

    // append new message to the chat, making chat message visible in UI
    chat?.appendChild(messageEl);
  }

  /**
   * toggles `start` and `stop` buttons' disabled states
   */
  function toggleBtnStates(): void {
    if (startBtn) startBtn.disabled = !startBtn.disabled;
    if (stopBtn) stopBtn.disabled = !stopBtn.disabled;
  }
})();
