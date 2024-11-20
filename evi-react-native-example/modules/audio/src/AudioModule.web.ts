import { EventEmitter } from 'expo-modules-core';
import { convertBlobToBase64, convertBase64ToBlob, getAudioStream, ensureSingleValidAudioTrack, getBrowserSupportedMimeType, MimeType } from 'hume';
import { AudioModuleEvents } from './Audio.types';

const emitter = new EventEmitter<AudioModuleEvents>();

let recorder: MediaRecorder | null = null;
let audioStream: MediaStream | null = null;
let currentAudio: HTMLAudioElement | null = null;
let isMuted = false;

const mimeType: MimeType = (() => {
  const result = getBrowserSupportedMimeType();
  return result.success ? result.mimeType : MimeType.WEBM;
})();

export default {
  async getPermissions() {
    console.log('Requesting microphone permissions...');
    await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('Microphone permissions granted.');
  },

  async startRecording(): Promise<void> {
    console.log('Starting audio recording...');

    audioStream = await getAudioStream();
    ensureSingleValidAudioTrack(audioStream);

    recorder = new MediaRecorder(audioStream, { mimeType });
    console.log(recorder)

    recorder.ondataavailable = async ({ data }) => {
      if (isMuted) return;
      if (data.size < 1) return;

      const base64EncodedAudio = await convertBlobToBase64(data);
      emitter.emit('onAudioInput', { base64EncodedAudio });
    };

    recorder.start(100); // Record audio in 100ms slices
    console.log('Audio recording started.');
  },

  async stopRecording(): Promise<void> {
    console.log('Stopping audio recording...');
    recorder?.stop();
    recorder = null;
    audioStream?.getTracks().forEach(track => track.stop());
    audioStream = null;
    console.log('Audio recording stopped.');
  },

  async playAudio(base64EncodedAudio: string): Promise<void> {
    console.log('Playing audio...');
    return new Promise((resolve) => {
      const audioBlob = convertBase64ToBlob(base64EncodedAudio, mimeType!);
      const audioUrl = URL.createObjectURL(audioBlob);
      currentAudio = new Audio(audioUrl);
      currentAudio.onended = () => resolve()
      currentAudio.play();
    })
  },

  async mute(): Promise<void> {
    isMuted = true;
  },

  async unmute(): Promise<void> {
    isMuted = false;
  },

  async stopPlayback(): Promise<void> {
    currentAudio?.pause();
    currentAudio = null;
  },

  isLinear16PCM: false,
  async addListener(eventName: keyof AudioModuleEvents, f: AudioModuleEvents[typeof eventName]): Promise<void> {
    emitter.addListener(eventName, f);
    return
  }
};
