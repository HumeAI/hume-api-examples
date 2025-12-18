declare module 'agora-rtc-react' {
  import type { ReactNode } from 'react';

  export type UID = number | string;

  export interface IRemoteAudioTrack
  {
    play ( element?: string | HTMLElement ): void;
  }

  export interface ILocalAudioTrack extends IRemoteAudioTrack
  {
    getMediaStreamTrack (): MediaStreamTrack;
    setEnabled ( enabled: boolean ): Promise<void>;
  }

  export interface IMicrophoneAudioTrack extends ILocalAudioTrack { }

  export interface IAgoraRTCClient
  {
    uid: UID;
    leave (): Promise<void>;
    publish (
      track: ILocalAudioTrack | Array<ILocalAudioTrack | null | undefined>
    ): Promise<void>;
    unpublish (
      track: ILocalAudioTrack | Array<ILocalAudioTrack | null | undefined>
    ): Promise<void>;
    subscribe ( user: { uid: UID; }, mediaType: 'audio' | 'video' ): Promise<void>;
    on ( event: string, listener: ( ...args: any[] ) => void ): void;
    renewToken ( token: string ): Promise<void>;
  }

  export function useRTCClient (): IAgoraRTCClient;
  export function useLocalMicrophoneTrack (
    enabled: boolean
  ): { localMicrophoneTrack: IMicrophoneAudioTrack | null; };
  export function useRemoteUsers (): Array<{
    uid: UID;
    audioTrack?: IRemoteAudioTrack;
  }>;
  export function useClientEvent<
    Listener extends ( ...args: any[] ) => void = ( ...args: any[] ) => void
  > ( client: IAgoraRTCClient | null, event: string, listener: Listener ): void;
  export function useIsConnected (): boolean;
  export function useJoin (
    options: {
      appid: string;
      channel: string;
      token?: string;
      uid: number;
    },
    auto: boolean
  ): { isConnected: boolean; };
  export function usePublish (
    tracks: Array<ILocalAudioTrack | null | undefined>
  ): void;

  export interface AgoraRTCProviderProps
  {
    client: IAgoraRTCClient;
    children?: ReactNode;
  }

  export const AgoraRTCProvider: React.FC<AgoraRTCProviderProps>;

  const AgoraRTC: {
    createClient ( config: { mode: 'rtc' | 'live'; codec: 'vp8' | 'h264'; } ): IAgoraRTCClient;
  };

  export default AgoraRTC;
}


