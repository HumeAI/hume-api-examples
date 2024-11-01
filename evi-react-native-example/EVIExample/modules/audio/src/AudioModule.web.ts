import { EventEmitter } from 'expo-modules-core';

const emitter = new EventEmitter({} as any);

export default {
  async getPermissions() {
    console.log('Pretending to get permissions...')
  },
  async startRecording(): Promise<void> {
    console.log('Pretending to start recording...')
  },
  async stopRecording(): Promise<void> {
    console.log('Pretending to stop recording...')
    //emitter.removeAllListeners('onAudioInput');
  },
  async playAudio(base64EncodedAudio: string): Promise<void> {
    console.log('Pretending to play audio...')
  },
  async mute(): Promise<void> {
    console.log('Pretending to mute...')
  },
  async unmute(): Promise<void> {
    console.log('Pretending to unmute...')
  }
};
