import {
  base64ToBlob,
  checkForAudioTracks,
  createConfig,
  getAudioStream,
  getSupportedMimeType,
  VoiceClient,
} from '@humeai/voice';

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
  const authBtn = getElementById<HTMLButtonElement>('auth-btn');
  const startBtn = getElementById<HTMLButtonElement>('start-btn');
  const endBtn = getElementById<HTMLButtonElement>('end-btn');
  const chat = getElementById<HTMLDivElement>('chat');

  authBtn?.addEventListener('click', authenticate);
  startBtn?.addEventListener('click', connect);
  endBtn?.addEventListener('click', disconnect);

  /**
   * audio playback queue
   */
  const audioQueue: Blob[] = [];
  const result = getSupportedMimeType();
  /**
   * mimeType supported by the browser the application is running in
   */
  const mimeType = result.success ? result.mimeType : 'audio/webm';
  /**
   * token used to make authenticated request
   */
  let accessToken: string;
  /**
   * the Hume EVI VoiceClient, includes methods for connecting to the interface and managing the Web Socket connection
   */
  let client: VoiceClient | null = null;
  /**
   * flag which denotes whether audio is currently playing
   */
  let isPlaying = false;
  /**
   * the current audio element to be played
   */
  let currentAudio: HTMLAudioElement | null = null;
  /**
   * the stream of audio captured from the user's microphone
   */
  let audioStream: MediaStream | null = null;
  /**
   * the recorder responsible for recording the audio stream to be prepared as the audio input
   */
  let recorder: MediaRecorder | null = null;

  /**
   * fetches access token using the API key and client secret specified within your environment variables
   */
  async function authenticate(): Promise<void> {
    const apiKey = import.meta.env.VITE_HUME_API_KEY || '';
    const clientSecret = import.meta.env.VITE_HUME_CLIENT_SECRET || '';

    const authString = `${apiKey}:${clientSecret}`;
    const encoded = btoa(authString);

    try {
      // see proxy configuration within the vite.config.js file
      const res = await fetch('https://api.hume.ai/oauth2-cc/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${encoded}`,
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
        }).toString(),
        cache: 'no-cache',
      });
      const data = (await res.json()) as { access_token: string };
      accessToken = String(data['access_token']);
      // update ui state
      if (authBtn) authBtn.disabled = true;
      if (startBtn) startBtn.disabled = false;
    } catch (e) {
      console.error('Failed to authenticate:', e);
    }
  }

  /**
   * instantiates interface config and client, sets up Web Socket handlers, and establishes secure Web Socket connection
   */
  async function connect(): Promise<void> {
    // creates minimal EVI configuration
    const config = createConfig({
      auth: {
        type: 'accessToken',
        value: accessToken,
      },
    });
    // instantiates the VoiceClient with configuration
    client = VoiceClient.create(config);
    // handler for Web Socket open event, triggered when connection is first established
    client.on('open', async () => {
      console.log('Web socket connection opened');
      await captureAudio();
    });
    // handler for Web Socket message event, triggered whenever a message is received from the server through the Web Socket
    client.on('message', async (message) => {
      switch (message.type) {
        case 'user_message':
        case 'assistant_message':
          const { role, content } = message.message;
          appendMessage(role, content);
          break;

        case 'audio_output':
          const audioOutput = message.data;
          const blob = base64ToBlob(audioOutput, mimeType);
          audioQueue.push(blob);
          if (audioQueue.length <= 1) {
            await playAudio();
          }
          break;

        case 'user_interruption':
          stopAudio();
          break;
      }
    });
    // handler for Web Socket close event, triggered when connection is closed
    client.on('close', () => {
      console.log('Web socket connection closed');
    });
    // establish secure Web Socket connection
    client.connect();
    // update ui state
    if (startBtn) startBtn.disabled = true;
    if (endBtn) endBtn.disabled = false;
  }

  /**
   * stops audio capture and playback, and closes the Web Socket connection
   */
  function disconnect(): void {
    // update ui state
    if (startBtn) startBtn.disabled = false;
    if (endBtn) endBtn.disabled = true;
    // stop audio playback
    stopAudio();
    // stop audio capture
    recorder?.stop();
    recorder = null;
    audioStream = null;
    // closed the Web Socket connection
    client?.disconnect();
    // adds "conversation ended" message to the chat
    appendMessage('system', 'Conversation ended.');
  }

  /**
   * captures and records audio stream
   */
  async function captureAudio(): Promise<void> {
    audioStream = await getAudioStream();
    // ensure there is only one audio audio track in the stream
    checkForAudioTracks(audioStream);

    recorder = new MediaRecorder(audioStream, { mimeType });

    recorder.ondataavailable = async ({ data }) => {
      if (data.size > 0 && client?.readyState === WebSocket.OPEN) {
        // convert Blob to binary
        const buffer = await data.arrayBuffer();
        // Send binary (audio input) through the Web Socket
        client?.sendAudio(buffer);
      }
    };
    // capture audio input at a rate of 100ms (recommended)
    recorder.start(100);
  }

  /**
   * play the audio within the playback queue, converting each Blob into playable HTMLAudioElements
   */
  function playAudio(): void {
    if (audioQueue.length > 0 && !isPlaying) {
      // update isPlaying state
      isPlaying = true;
      // pull next audio output from the queue
      const audioBlob = audioQueue.shift();

      if (audioBlob) {
        const audioUrl = URL.createObjectURL(audioBlob);
        // converts Blob to AudioElement for playback
        currentAudio = new Audio(audioUrl);
        // play audio
        currentAudio.play();
        // callback for when audio finishes playing
        currentAudio.onended = async () => {
          // update isPlaying state
          isPlaying = false;
          // attempt to pull next audio output from queue
          if (audioQueue.length) playAudio();
        };
      }
    }
  }

  /**
   * stops audio playback
   */
  function stopAudio(): void {
    currentAudio?.pause();
    currentAudio = null;
    isPlaying = false;
    audioQueue.length = 0;
  }

  /**
   * adds message to Chat in the webpage's UI
   *
   * @param role the speaker associated with the audio transcription
   * @param content transcript of the audio
   */
  function appendMessage(
    role: 'assistant' | 'system' | 'user',
    content: string
  ): void {
    const timestamp = new Date().toLocaleTimeString();
    const messageEl = document.createElement('p');
    messageEl.innerHTML = `<strong>[${timestamp}] ${role}:</strong> ${content}`;
    chat?.appendChild(messageEl);
  }
})();
