import { NextResponse } from 'next/server';

import
{
  AGORA_APP_ID,
  AGORA_BASE_URL,
  createAgoraAuthorizationHeader,
  validateEnvironment,
} from '../start-agent/route';

type SendMessageRequest = {
  agentId?: string;
  message?: string;
  limit?: number;
};

type AgoraHistoryItem = {
  role?: string;
  content?: string;
  create_ts?: number;
};

export async function POST ( request: Request )
{
  try
  {
    validateEnvironment();

    const body = ( await request.json().catch( () => null ) ) as
      | SendMessageRequest
      | null;

    if ( !body || typeof body !== 'object' )
    {
      return NextResponse.json(
        { error: 'Request body must be a JSON object.' },
        { status: 400 }
      );
    }

    const agentId = body.agentId?.trim();
    const message = body.message?.trim();
    const limit = Number.isFinite( body.limit ) ? Number( body.limit ) : 5;

    if ( !agentId )
    {
      return NextResponse.json(
        { error: 'Missing required field `agentId`.' },
        { status: 400 }
      );
    }

    if ( !message )
    {
      return NextResponse.json(
        { error: 'Missing required field `message`.' },
        { status: 400 }
      );
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: createAgoraAuthorizationHeader(),
    };

    const broadcastUrl = `${ AGORA_BASE_URL }/projects/${ AGORA_APP_ID }/agents/${ encodeURIComponent(
      agentId
    ) }/broadcast`;

    if ( process.env.NODE_ENV !== 'production' )
    {
      console.info(
        '[agent-message] broadcasting text',
        JSON.stringify( { broadcastUrl, agentId }, null, 2 )
      );
    }

    const broadcastResponse = await fetch(
      broadcastUrl,
      {
        method: 'POST',
        headers,
        body: JSON.stringify( {
          message: {
            type: 'TEXT',
            text: message,
          },
        } ),
      }
    );

    const broadcastResult = await broadcastResponse.json().catch( () => null );

    if ( !broadcastResponse.ok )
    {
      return NextResponse.json(
        {
          error: 'Failed to broadcast message to Agora agent.',
          status: broadcastResponse.status,
          detail: broadcastResult,
        },
        { status: broadcastResponse.status }
      );
    }

    const historyUrl = `${ AGORA_BASE_URL }/projects/${ AGORA_APP_ID }/agents/${ encodeURIComponent(
      agentId
    ) }/history?limit=${ Math.max( 1, limit ) }`;

    if ( process.env.NODE_ENV !== 'production' )
    {
      console.info(
        '[agent-message] fetching history',
        JSON.stringify( { historyUrl, limit }, null, 2 )
      );
    }

    const historyResponse = await fetch(
      historyUrl,
      {
        headers,
      }
    );

    const historyResult = ( await historyResponse
      .json()
      .catch( () => null ) ) as { history?: AgoraHistoryItem[]; } | null;

    if ( !historyResponse.ok )
    {
      return NextResponse.json(
        {
          status: historyResponse.status,
          warning: 'Message sent, but failed to retrieve history.',
          detail: historyResult,
        },
        { status: 207 }
      );
    }

    const history: AgoraHistoryItem[] = Array.isArray( historyResult?.history )
      ? ( historyResult!.history as AgoraHistoryItem[] )
      : [];

    const latestAgentReply = history.find(
      ( entry ) => entry.role === 'agent' && typeof entry.content === 'string'
    );

    return NextResponse.json( {
      ok: true,
      broadcast: broadcastResult,
      history,
      agentReply: latestAgentReply?.content ?? null,
    } );
  } catch ( error )
  {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error.';
    if ( process.env.NODE_ENV !== 'production' )
    {
      console.error( 'Failed to send agent message:', error );
    }
    return NextResponse.json( { error: message }, { status: 500 } );
  }
}


