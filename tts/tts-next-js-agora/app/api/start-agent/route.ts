import { NextResponse } from 'next/server';

export const AGORA_APP_ID =
  process.env.AGORA_APP_ID ?? process.env.AGORA_PROJECT_APP_ID ?? '';
export const AGORA_BASE_URL =
  process.env.AGORA_CONVERSATIONAL_AI_BASE_URL ??
  'https://api.agora.io/api/conversational-ai-agent/v2';
export const AGORA_CUSTOMER_ID = process.env.AGORA_CUSTOMER_ID ?? '';
export const AGORA_CUSTOMER_SECRET = process.env.AGORA_CUSTOMER_SECRET ?? '';
export const HUME_API_KEY = process.env.HUME_API_KEY ?? '';
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';

export function validateEnvironment ()
{
  const missingVariables = [
    AGORA_APP_ID ? null : 'AGORA_APP_ID or AGORA_PROJECT_APP_ID',
    AGORA_CUSTOMER_ID ? null : 'AGORA_CUSTOMER_ID',
    AGORA_CUSTOMER_SECRET ? null : 'AGORA_CUSTOMER_SECRET',
    HUME_API_KEY ? null : 'HUME_API_KEY',
    OPENAI_API_KEY ? null : 'OPENAI_API_KEY',
  ].filter( Boolean );

  if ( missingVariables.length > 0 )
  {
    throw new Error(
      `Missing required environment variable(s): ${ missingVariables.join( ', ' ) }`
    );
  }
}

export function createAgoraAuthorizationHeader (): string
{
  const credentials = `${ AGORA_CUSTOMER_ID }:${ AGORA_CUSTOMER_SECRET }`;
  const encoded = Buffer.from( credentials, 'utf8' ).toString( 'base64' );
  return `Basic ${ encoded }`;
}

function normalizeRemoteRtcUids ( value: unknown ): string[]
{
  if ( Array.isArray( value ) )
  {
    return value.map( ( uid ) => String( uid ).trim() ).filter( Boolean );
  }
  if ( typeof value === 'string' )
  {
    return value
      .split( ',' )
      .map( ( uid ) => uid.trim() )
      .filter( Boolean );
  }
  return [];
}

export async function POST ( request: Request )
{
  try
  {
    validateEnvironment();

    const incoming = await request.json().catch( () => null );
    const payload = incoming?.request ?? incoming;

    if ( !payload || typeof payload !== 'object' )
    {
      return NextResponse.json(
        { error: 'Request body must be an object with the Agora payload.' },
        { status: 400 }
      );
    }

    const { name, properties } = payload as {
      name?: string;
      properties?: Record<string, unknown>;
    };

    if ( !name )
    {
      return NextResponse.json(
        { error: 'Missing required field `name`.' },
        { status: 400 }
      );
    }

    if ( !properties || typeof properties !== 'object' )
    {
      return NextResponse.json(
        { error: 'Missing required object `properties`.' },
        { status: 400 }
      );
    }

    const channel = properties.channel;
    const token = properties.token;
    const agentRtcUid = properties.agent_rtc_uid;

    if ( !channel || typeof channel !== 'string' )
    {
      return NextResponse.json(
        { error: 'Missing required property `properties.channel`.' },
        { status: 400 }
      );
    }
    if ( !token || typeof token !== 'string' )
    {
      return NextResponse.json(
        { error: 'Missing required property `properties.token`.' },
        { status: 400 }
      );
    }
    if ( !agentRtcUid )
    {
      return NextResponse.json(
        { error: 'Missing required property `properties.agent_rtc_uid`.' },
        { status: 400 }
      );
    }

    const remoteRtcUids = normalizeRemoteRtcUids( properties.remote_rtc_uids );
    if ( !remoteRtcUids.length )
    {
      return NextResponse.json(
        {
          error:
            'Missing required property `properties.remote_rtc_uids`. Provide a comma separated string or array of UIDs.',
        },
        { status: 400 }
      );
    }

    const tts = properties.tts;
    if ( !tts || typeof tts !== 'object' )
    {
      return NextResponse.json(
        { error: 'Missing required object `properties.tts`.' },
        { status: 400 }
      );
    }

    const ttsParams = ( tts as Record<string, unknown> ).params;
    if ( !ttsParams || typeof ttsParams !== 'object' )
    {
      return NextResponse.json(
        { error: 'Missing required object `properties.tts.params`.' },
        { status: 400 }
      );
    }

    const llm = properties.llm;
    if ( !llm || typeof llm !== 'object' )
    {
      return NextResponse.json(
        { error: 'Missing required object `properties.llm`.' },
        { status: 400 }
      );
    }

    const forwardedPayload = {
      ...payload,
      properties: {
        ...properties,
        agent_rtc_uid: String( agentRtcUid ),
        remote_rtc_uids: remoteRtcUids,
        tts: {
          ...tts,
          params: {
            ...ttsParams,
            key: HUME_API_KEY,
          },
        },
        llm: {
          ...llm,
          api_key: OPENAI_API_KEY,
        },
      },
    };

    const agoraResponse = await fetch(
      `${ AGORA_BASE_URL }/projects/${ AGORA_APP_ID }/join`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: createAgoraAuthorizationHeader(),
        },
        body: JSON.stringify( forwardedPayload ),
      }
    );

    const rawBody = await agoraResponse.text();
    let parsedBody: unknown = null;

    try
    {
      parsedBody = rawBody ? JSON.parse( rawBody ) : null;
    } catch
    {
      parsedBody = rawBody;
    }

    if ( !agoraResponse.ok )
    {
      console.error(
        'Agora join request failed:',
        agoraResponse.status,
        agoraResponse.statusText,
        parsedBody
      );
      return NextResponse.json(
        {
          error: 'Agora API request failed.',
          status: agoraResponse.status,
          detail: parsedBody,
        },
        { status: agoraResponse.status }
      );
    }

    return NextResponse.json( parsedBody );
  } catch ( error )
  {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error.';
    if ( process.env.NODE_ENV !== 'production' )
    {
      console.error( 'Failed to start Agora agent:', error );
    }
    return NextResponse.json( { error: message }, { status: 500 } );
  }
}

