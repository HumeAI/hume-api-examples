import { EventEmitter } from 'expo-modules-core';
import { convertBlobToBase64, getAudioStream, ensureSingleValidAudioTrack, getBrowserSupportedMimeType, MimeType } from 'hume';
import { EVIWebAudioPlayer } from "hume";
import { AudioModuleEvents, MicrophoneMode } from './AudioModule.types';

const emitter = new EventEmitter<AudioModuleEvents>();

let recorder: MediaRecorder | null = null;
let audioStream: MediaStream | null = null;
let isMuted = false;

let _player: EVIWebAudioPlayer | null = null;
const player = async () => {
  if (_player) return _player;
  const p = new EVIWebAudioPlayer()
  await p.init()
  _player = p
  return p
}

const mimeType: MimeType = (() => {
  const result = getBrowserSupportedMimeType();
  return result.success ? result.mimeType : MimeType.WEBM;
})();

export default {
  async getPermissions(): Promise<boolean> {
    console.log('Requesting microphone permissions...');
    await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('Microphone permissions granted.');
    return true
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

  async enqueueAudio(base64EncodedAudio: string): Promise<void> {
    (await player()).enqueue({ type: 'audio_output', data: base64EncodedAudio });
  },

  async mute(): Promise<void> {
    isMuted = true;
  },

  async unmute(): Promise<void> {
    isMuted = false;
  },

  async stopPlayback(): Promise<void> {
    const p = await player()
    if (p?.playing) {
      p?.stop()
    }
  },

  isLinear16PCM: false,
  async addListener(eventName: keyof AudioModuleEvents, f: AudioModuleEvents[typeof eventName]): Promise<void> {
    emitter.addListener(eventName, f);
    return
  },

  async showMicrophoneModes(): Promise<void> {
    console.log('Microphone modes are only available on iOS');
    return;
  },

  async getMicrophoneMode(): Promise<MicrophoneMode> {
    return 'N/A';
  }
};
