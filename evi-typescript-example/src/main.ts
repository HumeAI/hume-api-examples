import { HumeClient } from 'hume';
import { StreamSocket } from 'hume/wrapper/empathicVoice/chat/StreamSocket';
import {
  base64ToBlob,
  checkForAudioTracks,
  getAudioStream,
  getSupportedMimeType,
} from './utils';

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
   * audio playback queue
   */
  const audioQueue: Blob[] = [];
  /**
   * mimeType supported by the browser the application is running in
   */
  const result = getSupportedMimeType();
  const mimeType = result.success ? result.mimeType : 'audio/webm';
  /**
   * the Hume Client, includes methods for connecting to EVI and managing the Web Socket connection
   */
  let client: HumeClient | null = null;
  /**
   * the WebSocket instance
   */
  let socket: StreamSocket | null = null;
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
   * instantiates interface config and client, sets up Web Socket handlers, and establishes secure Web Socket connection
   */
  async function connect(): Promise<void> {
    // instantiates the HumeClient
    if (client == null) {
      const apiKey = import.meta.env.VITE_HUME_API_KEY || '';
      const clientSecret = import.meta.env.VITE_HUME_CLIENT_SECRET || '';

      client = new HumeClient({ apiKey, clientSecret });
    }
    // instantiates WebSocket and establishes an authenticated connection
    socket = await client.empathicVoice.chat.connect({
      // handler for WebSocket open event, triggered when connection is first established
      onOpen: async () => {
        console.log('Web socket connection opened');
        await captureAudio();
      },
      // handler for WebSocket message event, triggered when a message is received
      onMessage: async (message) => {
        switch (message.type) {
          // append user and assistant messages to UI for chat visibility
          case 'user_message':
          case 'assistant_message':
            const { role, content } = message.message;
            appendMessage(role, content ?? '');
            break;
          // add received audio to the playback queue, and play next audio output
          case 'audio_output':
            const audioOutput = message.data;
            const blob = base64ToBlob(audioOutput, mimeType);
            audioQueue.push(blob);
            if (audioQueue.length <= 1) {
              playAudio();
            }
            break;
          // stop audio playback and clear playback queue
          case 'user_interruption':
            stopAudio();
            break;
        }
      },
      // handler for WebSocket error event, triggered when an error is received
      onError: (error) => {
        console.error(error.message);
      },
      // handler for WebSocket error event, triggered when connection is closed
      onClose: () => {
        console.log('Web socket connection closed');
      },
    });
    // update ui state
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
  }

  /**
   * stops audio capture and playback, and closes the Web Socket connection
   */
  function disconnect(): void {
    // update ui state
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
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
   * captures and records audio stream
   */
  async function captureAudio(): Promise<void> {
    audioStream = await getAudioStream();
    // ensure there is only one audio audio track in the stream
    checkForAudioTracks(audioStream);

    recorder = new MediaRecorder(audioStream, { mimeType });
  
    recorder.ondataavailable = async ({ data }) => {
      if (data.size > 0) {
        // convert Blob to binary
        const buffer = await data.arrayBuffer();
        // Send binary (audio input) through the Web Socket
        socket?.sendAudioInput(buffer);
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
  function appendMessage(role: string, content: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const messageEl = document.createElement('p');
    messageEl.innerHTML = `<strong>[${timestamp}] ${role}:</strong> ${content}`;
    chat?.appendChild(messageEl);
  }
})();
