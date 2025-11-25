import { describe, it, expect, vi } from "vitest";
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
  it(
    "starts a chat, receives a chatId, and stays alive for 2 seconds",
    async () =>
    {
      await import( "../main" );

      const connect = ( globalThis as any ).__connectEVI as () => void;
      const getSocket = ( globalThis as any ).__getEVISocket as () => any;

      connect();

      const chatId = await waitForChatMetadata( getSocket );

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
      await import( "../main" );

      const connect = ( globalThis as any ).__connectEVI as ( sessionSettings?: any ) => void;
      const disconnect = ( globalThis as any ).__disconnectEVI as () => void;
      const getSocket = ( globalThis as any ).__getEVISocket as () => any;

      // Disconnect any existing socket from previous tests
      disconnect();
      await sleep( 100 ); // Give socket time to fully close

      const sessionSettings = {
        systemPrompt: "you are a very kind person",
        voiceId: "5bb7de05-c8fe-426a-8fcc-ba4fc4ce9f9c",
        customSessionId: "my-custom-session-id",
        eventLimit: 100,
        audio: {
          encoding: "linear16" as const,
          sampleRate: 16000,
          channels: 1,
        },
        context: {
          text: "You are a helpful assistant.",
          type: "persistent" as const,
        },
        variables: {
          userName: "John",
          userAge: 30,
          isPremium: true,
        },
      };

      try
      {
        connect( sessionSettings );
      } catch ( err )
      {
        throw new Error( `connect() threw an error: ${ err instanceof Error ? err.message : String( err ) }` );
      }

      // Wait a bit for socket to be created
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

      const chatId = await waitForChatMetadata( getSocket );
      expect( typeof chatId ).toBe( "string" );
      expect( chatId.length ).toBeGreaterThan( 0 );

      await sleep( 500 );

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
        const sessionSettings = JSON.parse( sessionSettingsEvent.messageText );
        expect( sessionSettings.type ).toBe( "session_settings" );

        console.log( "  ✓ systemPrompt" );
        expect( sessionSettings.system_prompt ).toBe( "you are a very kind person" );

        console.log( "  ✓ voiceId" );
        expect( sessionSettings.voice_id ).toBe( "5bb7de05-c8fe-426a-8fcc-ba4fc4ce9f9c" );

        console.log( "  ✓ customSessionId" );
        expect( sessionSettings.custom_session_id ).toBe( "my-custom-session-id" );

        console.log( "  ✓ eventLimit" );
        expect( sessionSettings.event_limit ).toBe( 100 );

        console.log( "  ✓ audio.encoding" );
        expect( sessionSettings.audio ).toBeDefined();
        expect( sessionSettings.audio.encoding ).toBe( "linear16" );
        console.log( "  ✓ audio.sampleRate" );
        expect( sessionSettings.audio.sample_rate ).toBe( 16000 );
        console.log( "  ✓ audio.channels" );
        expect( sessionSettings.audio.channels ).toBe( 1 );

        console.log( "  ✓ context.text" );
        expect( sessionSettings.context ).toBeDefined();
        expect( sessionSettings.context.text ).toBe( "You are a helpful assistant." );
        console.log( "  ✓ context.type" );
        expect( sessionSettings.context.type ).toBe( "persistent" );

        console.log( "  ✓ variables.userName" );
        expect( sessionSettings.variables ).toBeDefined();
        expect( sessionSettings.variables.userName ).toBe( "John" );
        console.log( "  ✓ variables.userAge" );
        expect( sessionSettings.variables.userAge ).toBe( "30" );
        console.log( "  ✓ variables.isPremium" );
        expect( sessionSettings.variables.isPremium ).toBe( "true" );
      }

      socket.close();
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
