import {
  base64ToBlob,
  checkForAudioTracks,
  getAudioStream,
  getSupportedMimeType,
} from '@humeai/voice';

import { HumeClient } from "hume";
import { StreamSocket } from 'hume/wrapper/empathicVoice/chat/StreamSocket';

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
  const endBtn = getElementById<HTMLButtonElement>('end-btn');
  const chat = getElementById<HTMLDivElement>('chat');

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
   * the Hume EVI VoiceClient, includes methods for connecting to the interface and managing the Web Socket connection
   */
  let client: HumeClient | null = null;
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
    // instantiates the VoiceClient with configuration
    if (client == null)  {
      const apiKey = import.meta.env.VITE_HUME_API_KEY || '';
      const clientSecret = import.meta.env.VITE_HUME_CLIENT_SECRET || '';  

      client = new HumeClient({
        apiKey,
        clientSecret,
      })
    }

    socket = await client.empathicVoice.chat.connect({
      // handler for Web Socket open event, triggered when connection is first established
      onOpen: async () => {
        console.log('Web socket connection opened');
        await captureAudio();
      },
      onMessage: async (message) => {
        switch(message.type) {
          case "user_message":
          case "assistant_message":
            const { role, content } = message.message;
            appendMessage(role, content ?? "");
            break;
          case "audio_output":
            const audioOutput = message.data;
            const blob = base64ToBlob(audioOutput, mimeType);
            audioQueue.push(blob);
            if (audioQueue.length <= 1) {
              playAudio();
            }
            break;
          case "user_interruption":
            stopAudio();
            break;
        }
      }, 
      onClose: () => {
        console.log('Web socket connection closed');
      }
    });
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
  function appendMessage(
    role: string,
    content: string
  ): void {
    const timestamp = new Date().toLocaleTimeString();
    const messageEl = document.createElement('p');
    messageEl.innerHTML = `<strong>[${timestamp}] ${role}:</strong> ${content}`;
    chat?.appendChild(messageEl);
  }
})();
