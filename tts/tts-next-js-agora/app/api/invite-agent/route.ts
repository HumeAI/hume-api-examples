import { NextResponse } from 'next/server';
import
{
  ClientStartRequest,
  AgentResponse,
  AgoraStartRequest,
  TTSConfig,
  TTSVendor,
  HumeTTSParams,
} from '@/types/conversation';

const DEFAULT_BASE_URL =
  'https://api.agora.io/api/conversational-ai-agent/v2';

const AGORA_APP_ID =
  process.env.NEXT_PUBLIC_AGORA_APP_ID ??
  process.env.AGORA_APP_ID ??
  process.env.AGORA_PROJECT_APP_ID ??
  '';
const AGORA_BASE_URL =
  ( process.env.NEXT_PUBLIC_AGORA_CONVO_AI_BASE_URL ??
    process.env.AGORA_CONVERSATIONAL_AI_BASE_URL ??
    DEFAULT_BASE_URL
  ).replace( /\/+$/, '' );
const AGORA_CUSTOMER_ID =
  process.env.NEXT_PUBLIC_AGORA_CUSTOMER_ID ?? process.env.AGORA_CUSTOMER_ID ?? '';
const AGORA_CUSTOMER_SECRET =
  process.env.NEXT_PUBLIC_AGORA_CUSTOMER_SECRET ??
  process.env.AGORA_CUSTOMER_SECRET ??
  '';
const AGORA_AGENT_UID =
  process.env.NEXT_PUBLIC_AGENT_UID ?? process.env.AGORA_AGENT_UID ?? '1001';

const HUME_API_KEY =
  process.env.NEXT_PUBLIC_HUME_API_KEY ?? process.env.HUME_API_KEY ?? '';
const HUME_VOICE_ID =
  process.env.NEXT_PUBLIC_HUME_VOICE_ID ?? process.env.HUME_VOICE_ID ?? '';

const OPENAI_API_KEY =
  process.env.NEXT_PUBLIC_LLM_API_KEY ?? process.env.OPENAI_API_KEY ?? '';
const OPENAI_MODEL =
  process.env.NEXT_PUBLIC_LLM_MODEL ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

function validateEnvironment ()
{
  const missing = [
    AGORA_APP_ID ? null : 'AGORA_APP_ID',
    AGORA_CUSTOMER_ID ? null : 'AGORA_CUSTOMER_ID',
    AGORA_CUSTOMER_SECRET ? null : 'AGORA_CUSTOMER_SECRET',
    HUME_API_KEY ? null : 'HUME_API_KEY',
    HUME_VOICE_ID ? null : 'HUME_VOICE_ID',
    OPENAI_API_KEY ? null : 'OPENAI_API_KEY',
  ].filter( Boolean );

  if ( missing.length > 0 )
  {
    throw new Error(
      `Missing required environment variable(s): ${ missing.join( ', ' ) }`
    );
  }
}

function createAuthorizationHeader (): string
{
  const credentials = `${ AGORA_CUSTOMER_ID }:${ AGORA_CUSTOMER_SECRET }`;
  return `Basic ${ Buffer.from( credentials, 'utf8' ).toString( 'base64' ) }`;
}

function getTTSConfig ( vendor: TTSVendor ): TTSConfig
{
  if ( vendor === TTSVendor.Hume )
  {
    return {
      vendor,
      params: {
        voice_id: HUME_VOICE_ID,
        key: HUME_API_KEY,
        trailing_silence: 0.35,
        speed: 1,
        provider: 'HUME_AI',
      },
    };
  }

  throw new Error( `Unsupported TTS vendor: ${ vendor }` );
}

function getConfig ()
{
  validateEnvironment();

  const ttsVendor =
    ( process.env.NEXT_PUBLIC_TTS_VENDOR as TTSVendor | undefined ) ??
    TTSVendor.Hume;

  return {
    agora: {
      baseUrl: AGORA_BASE_URL,
      appId: AGORA_APP_ID,
      agentUid: AGORA_AGENT_UID,
    },
    llm: {
      url:
        process.env.NEXT_PUBLIC_LLM_URL ??
        process.env.OPENAI_BASE_URL ??
        'https://api.openai.com/v1/chat/completions',
      api_key: OPENAI_API_KEY,
      model: OPENAI_MODEL,
    },
    tts: getTTSConfig( ttsVendor ),
  };
}

export async function POST ( request: Request )
{
  try
  {
    const config = getConfig();

    const body = ( await request.json() ) as ClientStartRequest;

    const remoteUids = body.requester_id
      ? [ body.requester_id ]
      : [ config.agora.agentUid ];

    const humeParams = config.tts.params as HumeTTSParams;

    const payload: AgoraStartRequest = {
      name:
        body.agentName ??
        `conversation-${ Date.now() }-${ Math.random()
          .toString( 36 )
          .slice( 2, 8 ) }`,
      properties: {
        channel: body.channel_name,
        token: body.token ?? '',
        agent_rtc_uid: config.agora.agentUid,
        remote_rtc_uids: remoteUids,
        enable_string_uid: /[^\d]/.test( config.agora.agentUid ),
        idle_timeout: 30,
        asr: {
          language: 'en-US',
          task: 'conversation',
        },
        llm: {
          url: config.llm.url,
          api_key: config.llm.api_key,
          greeting_message: 'Hello! How can I assist you today?',
          failure_message: 'Please wait a moment.',
          max_history: 10,
          input_modalities: body.input_modalities ?? [ 'text' ],
          output_modalities: body.output_modalities ?? [ 'text', 'audio' ],
          params: {
            model: config.llm.model,
            max_tokens: 1024,
            temperature: 0.7,
            top_p: 0.95,
          },
        },
        vad: {
          silence_duration_ms: 480,
          speech_duration_ms: 15000,
          threshold: 0.5,
          interrupt_duration_ms: 160,
          prefix_padding_ms: 300,
        },
        tts: {
          vendor: 'humeai',
          params: {
            voice_id: humeParams.voice_id,
            provider: 'HUME_AI',
            key: humeParams.key ?? HUME_API_KEY,
            trailing_silence: humeParams.trailing_silence ?? 0.35,
            speed: humeParams.speed ?? 1,
          },
        },
        advanced_features: {
          enable_aivad: false,
          enable_bhvs: false,
        },
      },
    };

    const response = await fetch(
      `${ config.agora.baseUrl }/${ config.agora.appId }/join`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: createAuthorizationHeader(),
        },
        body: JSON.stringify( payload ),
      }
    );

    const raw = await response.text();

    if ( !response.ok )
    {
      console.error( '[invite-agent] upstream error:', raw );
      return NextResponse.json(
        { error: 'Failed to start conversation', detail: raw },
        { status: response.status }
      );
    }

    const data = JSON.parse( raw ) as AgentResponse;
    return NextResponse.json( data );
  } catch ( error: unknown )
  {
    console.error( 'Error starting conversation:', error );
    const message =
      error instanceof Error ? error.message : 'Failed to start conversation';
    return NextResponse.json( { error: message }, { status: 500 } );
  }
}


