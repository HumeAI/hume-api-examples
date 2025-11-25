import { describe, it, expect, vi, beforeAll } from "vitest";
import { HumeClient } from "hume";
import type { Hume } from "hume";

// Mock audio dependencies (handleOpen calls these)
vi.mock( "../lib/audio", () => ( {
  startAudioCapture: vi.fn( () =>
    Promise.resolve( { stream: { getTracks: () => [] } } ),
  ),
} ) );

// Mock WebAudioPlayer (to define AudioContext)
vi.mock( "hume", async () =>
{
  const actual = await vi.importActual<any>( "hume" );
  return {
    ...actual,
    EVIWebAudioPlayer: vi.fn( () => ( {
      init: vi.fn( () => Promise.resolve() ),
      stop: vi.fn(),
      enqueue: vi.fn(),
      dispose: vi.fn(),
    } ) ),
  };
} );

// Minimal DOM mock (main.ts touches document at module load time)
Object.defineProperty( globalThis, "document", {
  value: { querySelector: vi.fn( () => null ) },
  writable: true,
  configurable: true,
} );

describe( "connect to EVI", () =>
{
  let chatId: string;
  let getSocket: () => any;

  const sessionSettings = {
    systemPrompt: "You are a helpful assistant",
    voiceId: "5bb7de05-c8fe-426a-8fcc-ba4fc4ce9f9c",
    customSessionId: "my-custom-session-id",
    eventLimit: 100,
    audio: {
      encoding: "linear16" as const,
      sampleRate: 16000,
      channels: 1,
    },
    context: {
      text: "This is not your first conversation with the user, you'reve talked to them before",
      type: "persistent" as const,
    },
    variables: {
      userName: "John",
      userAge: 30,
      isPremium: true,
    },
  };

  beforeAll( async () =>
  {
    await import( "../main" );

    const connect = ( globalThis as any ).__connectEVI as ( sessionSettings?: any ) => void;
    getSocket = ( globalThis as any ).__getEVISocket as () => any;

    try
    {
      connect( sessionSettings );
    } catch ( err )
    {
      throw new Error( `connect() threw an error: ${ err instanceof Error ? err.message : String( err ) }` );
    }

    await sleep( 100 );

    const socket = getSocket();
    if ( !socket )
    {
      throw new Error( "Socket was not created after connect(). This usually means connectEVI() threw an error (check console for details)." );
    }

    // Wait for socket to open
    await new Promise<void>( ( resolve, reject ) =>
    {
      if ( socket.readyState === WebSocket.OPEN )
      {
        resolve();
        return;
      }

      socket.on( "open", () =>
      {
        resolve();
      } );

      socket.on( "error", ( err ) =>
      {
        reject( err instanceof Error ? err : new Error( String( err ) ) );
      } );

      socket.on( "close", ( event ) =>
      {
        reject( new Error( `Socket closed before opening. Code: ${ ( event as any )?.code }, Reason: ${ ( event as any )?.reason }` ) );
      } );
    } );

    chatId = await waitForChatMetadata( getSocket );
    expect( typeof chatId ).toBe( "string" );
    expect( chatId.length ).toBeGreaterThan( 0 );
  } );

  it(
    "starts a chat, receives a chatId, and stays alive for 2 seconds",
    async () =>
    {
      expect( typeof chatId ).toBe( "string" );
      expect( chatId.length ).toBeGreaterThan( 0 );

      await sleep( 2_000 );

      const socket = getSocket();
      expect( socket?.readyState ).toBe( 1 );
    },
  );

  it(
    "verifies sessionSettings are passed on connect()",
    async () =>
    {
      // List chat events
      const client = new HumeClient( { apiKey: process.env.TEST_HUME_API_KEY! } );
      const page = await client.empathicVoice.chats.listChatEvents( chatId, {
        pageNumber: 0,
        ascendingOrder: true,
      } );

      const events: Hume.empathicVoice.ReturnChatEvent[] = [];
      for await ( const event of page )
      {
        events.push( event );
      }

      // Find the SESSION_SETTINGS event
      const sessionSettingsEvent = events.find(
        ( event ) => ( event.type as string ) === "SESSION_SETTINGS"
      );

      expect( sessionSettingsEvent ).toBeDefined();
      expect( sessionSettingsEvent?.messageText ).toBeDefined();

      if ( sessionSettingsEvent?.messageText )
      {
        const parsedSettings = JSON.parse( sessionSettingsEvent.messageText );
        expect( parsedSettings.type ).toBe( "session_settings" );

        console.log( "  ✓ systemPrompt" );
        expect( parsedSettings.system_prompt ).toBe( sessionSettings.systemPrompt );

        console.log( "  ✓ voiceId" );
        expect( parsedSettings.voice_id ).toBe( sessionSettings.voiceId );

        console.log( "  ✓ customSessionId" );
        expect( parsedSettings.custom_session_id ).toBe( sessionSettings.customSessionId );

        console.log( "  ✓ eventLimit" );
        expect( parsedSettings.event_limit ).toBe( sessionSettings.eventLimit );

        console.log( "  ✓ audio.encoding" );
        expect( parsedSettings.audio ).toBeDefined();
        expect( parsedSettings.audio.encoding ).toBe( sessionSettings.audio.encoding );
        console.log( "  ✓ audio.sampleRate" );
        expect( parsedSettings.audio.sample_rate ).toBe( sessionSettings.audio.sampleRate );
        console.log( "  ✓ audio.channels" );
        expect( parsedSettings.audio.channels ).toBe( sessionSettings.audio.channels );

        console.log( "  ✓ context.text" );
        expect( parsedSettings.context ).toBeDefined();
        expect( parsedSettings.context.text ).toBe( sessionSettings.context.text );
        console.log( "  ✓ context.type" );
        expect( parsedSettings.context.type ).toBe( sessionSettings.context.type );

        console.log( "  ✓ variables.userName" );
        expect( parsedSettings.variables ).toBeDefined();
        // casting to string because all variables are saved as strings on the backend
        expect( parsedSettings.variables.userName ).toBe( String( sessionSettings.variables.userName ) );
        console.log( "  ✓ variables.userAge" );
        expect( parsedSettings.variables.userAge ).toBe( String( sessionSettings.variables.userAge ) );
        console.log( "  ✓ variables.isPremium" );
        expect( parsedSettings.variables.isPremium ).toBe( String( sessionSettings.variables.isPremium ) );
      }
    },
  );
} );

function waitForChatMetadata (
  getSocket: () => any
): Promise<string>
{
  return new Promise( ( resolve, reject ) =>
  {
    const attachListeners = () =>
    {
      const socket = getSocket();

      if ( !socket )
      {
        reject( new Error( "Socket is null" ) );
        return;
      }

      const onMessage = ( msg: any ) =>
      {
        if ( msg.type === "chat_metadata" && msg.chatId )
        {
          resolve( msg.chatId );
        }
      };

      const onError = ( err: any ) =>
      {
        reject(
          new Error(
            `${ String( err ) }`,
          ),
        );
      };

      const onClose = ( event: any ) =>
      {
        reject( new Error( `Socket closed while waiting for chat_metadata. Code: ${ event?.code }, Reason: ${ event?.reason }, Socket state: ${ socket.readyState }` ) );
      };

      socket.on( "message", onMessage );
      socket.on( "error", onError );
      socket.on( "close", onClose );
    };

    attachListeners();
  } );
}

const sleep = ( ms: number ) =>
  new Promise<void>( ( resolve ) => setTimeout( resolve, ms ) );
