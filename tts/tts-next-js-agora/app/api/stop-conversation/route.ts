import { NextResponse } from 'next/server';

const AGORA_APP_ID =
  process.env.NEXT_PUBLIC_AGORA_APP_ID ??
  process.env.AGORA_APP_ID ??
  process.env.AGORA_PROJECT_APP_ID ??
  '';
const AGORA_BASE_URL =
  ( process.env.NEXT_PUBLIC_AGORA_CONVO_AI_BASE_URL ??
    process.env.AGORA_CONVERSATIONAL_AI_BASE_URL ??
    'https://api.agora.io/api/conversational-ai-agent/v2'
  ).replace( /\/+$/, '' );
const AGORA_CUSTOMER_ID =
  process.env.NEXT_PUBLIC_AGORA_CUSTOMER_ID ?? process.env.AGORA_CUSTOMER_ID ?? '';
const AGORA_CUSTOMER_SECRET =
  process.env.NEXT_PUBLIC_AGORA_CUSTOMER_SECRET ??
  process.env.AGORA_CUSTOMER_SECRET ??
  '';

type StopRequest = {
  agent_id?: string;
};

export async function POST ( request: Request )
{
  if ( !AGORA_APP_ID || !AGORA_CUSTOMER_ID || !AGORA_CUSTOMER_SECRET )
  {
    return NextResponse.json(
      { error: 'Agora credentials are not configured on the server.' },
      { status: 500 }
    );
  }

  const body = ( await request.json().catch( () => null ) ) as StopRequest | null;

  if ( !body?.agent_id )
  {
    return NextResponse.json(
      { error: 'Request body must include `agent_id`.' },
      { status: 400 }
    );
  }

  const authHeader = `Basic ${ Buffer.from(
    `${ AGORA_CUSTOMER_ID }:${ AGORA_CUSTOMER_SECRET }`
  ).toString( 'base64' ) }`;

  const url = `${ AGORA_BASE_URL }/${ AGORA_APP_ID }/agents/${ encodeURIComponent(
    body.agent_id
  ) }/leave`;

  try
  {
    const response = await fetch( url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    } );

    if ( !response.ok )
    {
      const detail = await response.text();
      return NextResponse.json(
        {
          error: 'Failed to stop conversation',
          detail,
        },
        { status: response.status }
      );
    }

    return NextResponse.json( { success: true } );
  } catch ( error )
  {
    console.error( 'Failed to stop conversation:', error );
    return NextResponse.json(
      { error: 'Failed to stop conversation' },
      { status: 500 }
    );
  }
}


