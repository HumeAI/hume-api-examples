import { describe, it, expect, vi } from "vitest";

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
    5_000,
  );
} );

function waitForChatMetadata (
  getSocket: () => any,
): Promise<string>
{
  return new Promise( ( resolve, reject ) =>
  {
    const attachListeners = () =>
    {
      const socket = getSocket();

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

      socket.on( "message", onMessage );
      socket.on( "error", onError );
    };

    attachListeners();
  } );
}

const sleep = ( ms: number ) =>
  new Promise<void>( ( resolve ) => setTimeout( resolve, ms ) );
