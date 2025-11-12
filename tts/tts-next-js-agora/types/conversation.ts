import type { UID } from 'agora-rtc-react';

export interface AgoraTokenData
{
  token: string;
  uid: string;
  channel: string;
  agentId?: string;
  expires_at?: number;
}

export interface ClientStartRequest
{
  requester_id: string;
  channel_name: string;
  token?: string;
  agentName?: string;
  input_modalities?: string[];
  output_modalities?: string[];
}

export interface StopConversationRequest
{
  agent_id: string;
}

export interface ConversationComponentProps
{
  agoraData: AgoraTokenData;
  onTokenWillExpire?: ( uid: string ) => Promise<string>;
  onEndConversation?: () => void;
}

export interface AgentResponse
{
  agent_id: string;
  create_ts: number;
  status: string;
}

export interface HumeTTSParams
{
  voice_id: string;
  key?: string;
  api_key?: string;
  provider?: string;
  speed?: number;
  trailing_silence?: number;
}

export interface AgoraStartRequest
{
  name: string;
  properties: {
    channel: string;
    token: string;
    agent_rtc_uid: string | number;
    remote_rtc_uids: ( string | number )[];
    enable_string_uid?: boolean;
    idle_timeout?: number;
    asr: {
      language: string;
      task?: string;
    };
    llm: {
      url?: string;
      api_key?: string;
      greeting_message: string;
      failure_message: string;
      max_history?: number;
      input_modalities?: string[];
      output_modalities?: string[];
      params: {
        model: string;
        max_tokens: number;
        temperature?: number;
        top_p?: number;
      };
    };
    vad: {
      silence_duration_ms: number;
      speech_duration_ms?: number;
      threshold?: number;
      interrupt_duration_ms?: number;
      prefix_padding_ms?: number;
    };
    tts: TTSConfig;
    advanced_features?: {
      enable_aivad?: boolean;
      enable_bhvs?: boolean;
    };
  };
}

export enum TTSVendor
{
  Microsoft = 'microsoft',
  ElevenLabs = 'elevenlabs',
  Hume = 'hume',
}

export interface MicrosoftTTSParams
{
  key: string;
  region: string;
  voice_name: string;
  rate?: number;
  volume?: number;
}

export interface ElevenLabsTTSParams
{
  key: string;
  voice_id: string;
  model_id: string;
}

export interface TTSConfig
{
  vendor: TTSVendor | string;
  params: MicrosoftTTSParams | ElevenLabsTTSParams | HumeTTSParams;
}

export interface TokenRenewalHandler
{
  ( uid: UID ): Promise<string>;
}


