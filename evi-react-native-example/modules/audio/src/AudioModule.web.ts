import { EventEmitter } from 'expo-modules-core';
import { convertBlobToBase64, convertBase64ToBlob, getAudioStream, ensureSingleValidAudioTrack, getBrowserSupportedMimeType, MimeType } from 'hume';
import { AudioModuleEvents } from './Audio.types';

const emitter = new EventEmitter<AudioModuleEvents>();

let recorder: MediaRecorder | null = null;
let audioStream: MediaStream | null = null;
let currentAudio: HTMLAudioElement | null = null;
let isMuted = false;

/**
 * An AudioClip is a function that you can call to play some audio.
 * It returns a promise that is resolved when the audio is finished playing.
 */
type AudioClip = () => Promise<void>;

// EVI can send audio output messages faster than they can be played back.
// It is important to buffer them in a queue so as not to cut off a clip of
// playing audio with a more recent clip. `audioQueue` is a global
// audio queue that manages this buffering.
const audioQueue = {
  clips: [] as Array<AudioClip>,
  currentlyPlaying: false,

  advance() {
    if (this.clips.length === 0) {
      this.currentlyPlaying = false;
      return;
    }
    const nextClip = this.clips.shift()!;
    nextClip().then(() => this.advance());
    this.currentlyPlaying = true;
  },

  add(clip: AudioClip) {
    this.clips.push(clip);

    if (!this.currentlyPlaying) {
      this.advance();
    }
  },

  clear() {
    this.clips = [];
    this.currentlyPlaying = false;
  },
};

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

  async enqueueAudio(base64EncodedAudio: string): Promise<void> {
    audioQueue.add(() => new Promise((resolve) => {
      const audioBlob = convertBase64ToBlob(base64EncodedAudio, mimeType!);
      const audioUrl = URL.createObjectURL(audioBlob);
      currentAudio = new Audio(audioUrl);
      currentAudio.onended = () => resolve()
      currentAudio.play();
    }))
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
