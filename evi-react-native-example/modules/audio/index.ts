import { NativeModulesProxy, EventEmitter, Subscription } from 'expo-modules-core';

// Import the native module. On web, it will be resolved to Audio.web.ts
// and on native platforms to Audio.ts
import AudioModule from './src/AudioModule';
import { AudioEventPayload, ErrorPayload } from './src/Audio.types';

export async function getPermissions(): Promise<void> {
  return await AudioModule.getPermissions();
}

export async function startRecording(): Promise<void> {
  await AudioModule.startRecording();
}

export async function playAudio(base64EncodedAudio: string): Promise<void> {
  await AudioModule.playAudio(base64EncodedAudio);
}

export async function stopPlayback(): Promise<void> {
  await AudioModule.stopPlayback();
}

export async function mute(): Promise<void> {
  await AudioModule.mute();
}

export async function unmute(): Promise<void> {
  await AudioModule.unmute();
}

export const sampleRate = AudioModule.sampleRate
export const isLinear16PCM = AudioModule.isLinear16PCM

const emitter = new EventEmitter(AudioModule ?? NativeModulesProxy.Audio);
export async function stopRecording(): Promise<void> {
  emitter.removeAllListeners('onAudioInput');
  return await AudioModule.stopRecording();
}

export function onAudioInput(listener: (event: AudioEventPayload) => void): Subscription {
  return emitter.addListener<AudioEventPayload>('onAudioInput', listener);
}
export function onError(listener: (event: ErrorPayload) => void): Subscription {
  return emitter.addListener<ErrorPayload>('onError', listener);
}

export { AudioEventPayload };