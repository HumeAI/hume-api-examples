import { NativeModule, requireNativeModule } from 'expo';

import { AudioModuleEvents } from './AudioModule.types';

declare class AudioModule extends NativeModule<AudioModuleEvents> {
  getPermissions(): Promise<boolean>;
  startRecording(): Promise<void>;
  enqueueAudio(base64EncodedAudio: string): Promise<void>;
  stopPlayback(): Promise<void>;
  mute(): Promise<void>;
  unmute(): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<AudioModule>('Audio');
