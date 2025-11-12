import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-token';

const APP_ID =
  process.env.NEXT_PUBLIC_AGORA_APP_ID ??
  process.env.AGORA_APP_ID ??
  process.env.AGORA_PROJECT_APP_ID ??
  '';
const APP_CERTIFICATE =
  process.env.NEXT_PUBLIC_AGORA_APP_CERTIFICATE ??
  process.env.AGORA_APP_CERTIFICATE ??
  '';
const EXPIRATION_SECONDS = Number(
  process.env.NEXT_PUBLIC_AGORA_TOKEN_TTL_SECONDS ??
  process.env.AGORA_TOKEN_TTL_SECONDS ??
  3600
);

function generateChannelName (): string
{
  const timestamp = Date.now();
  const random = Math.random().toString( 36 ).substring( 2, 8 );
  return `ai-conversation-${ timestamp }-${ random }`;
}

export async function GET ( request: NextRequest )
{
  if ( !APP_ID || !APP_CERTIFICATE )
  {
    return NextResponse.json(
      { error: 'Agora credentials are not configured on the server.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL( request.url );
  const uidParam = searchParams.get( 'uid' ) ?? '0';
  const channel =
    searchParams.get( 'channel' )?.trim() || generateChannelName().trim();

  const numericUid = Number( uidParam );
  const expiresAt =
    Math.floor( Date.now() / 1000 ) + Math.max( EXPIRATION_SECONDS, 60 );

  try
  {
    let token: string;

    if ( Number.isFinite( numericUid ) )
    {
      token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channel,
        numericUid,
        RtcRole.PUBLISHER,
        expiresAt,
        expiresAt
      );
    } else
    {
      token = RtcTokenBuilder.buildTokenWithAccount(
        APP_ID,
        APP_CERTIFICATE,
        channel,
        uidParam,
        RtcRole.PUBLISHER,
        expiresAt,
        expiresAt
      );
    }

    return NextResponse.json( {
      token,
      uid: Number.isFinite( numericUid ) ? numericUid.toString() : uidParam,
      channel,
      expires_at: expiresAt,
    } );
  } catch ( error )
  {
    console.error( 'Failed to generate Agora token:', error );
    return NextResponse.json(
      { error: 'Failed to generate Agora token' },
      { status: 500 }
    );
  }
}


