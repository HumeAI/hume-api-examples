import "./styles/globals.css";
import { EVIWebAudioPlayer } from "hume";
import type { Hume } from "hume";
import { appendChatMessage, connectEVI, startAudioCapture } from "./lib";

( async () =>
{
  const apiKey = import.meta.env.VITE_HUME_API_KEY!;
  const configId = import.meta.env.VITE_HUME_CONFIG_ID;

  // // Uncomment the lines below for Example 1: Voice Switching Mid-Chat
  // // Define two voice IDs to switch between
  // const voices = {
  //   player1: "5bb7de05-c8fe-426a-8fcc-ba4fc4ce9f9c",
  //   player2: "ee96fb5f-ec1a-4f41-a9ba-6d119e64c8fd"
  // }
  // // Start with the voice used in your VITE_HUME_CONFIG_ID
  // // If no config ID, Hume defaults to "5bb7de05-c8fe-426a-8fcc-ba4fc4ce9f9c"
  // let currentVoice = voices.player1;

  // const switchBtn = document.querySelector<HTMLButtonElement>("button#switch-btn");


  // function switchVoice() {
  //   // Toggle between the two voice IDs
  //   if (currentVoice === voices.player1) {
  //     currentVoice = voices.player2;
  //   } else {
  //     currentVoice = voices.player1;
  //   }

  //   console.log("Switching voice to:", currentVoice);

  //   // Send session settings update to switch voice
  //   socket?.sendSessionSettings({
  //     voiceId: currentVoice
  //   });
  // }

  // switchBtn?.addEventListener("click", switchVoice);

  const startBtn = document.querySelector<HTMLButtonElement>( "button#start-btn" );
  const stopBtn = document.querySelector<HTMLButtonElement>( "button#stop-btn" );
  const chatContainer = document.querySelector<HTMLElement>( "section#chat" );

  let socket: Hume.empathicVoice.chat.ChatSocket | null = null;
  let recorder: MediaRecorder | null = null;
  let player = new EVIWebAudioPlayer();

  function setConnected ( on: boolean ): void
  {
    if ( startBtn ) startBtn.disabled = on;
    if ( stopBtn ) stopBtn.disabled = !on;
    // if (switchBtn) switchBtn.disabled = !on; // Uncomment for Example 1: Voice Switching Mid-Chat
  }

  async function handleOpen ()
  {
    console.log( "Socket opened" );
    recorder = await startAudioCapture( socket! );
    await player.init();
  }

  async function handleMessage ( msg: Hume.empathicVoice.chat.SubscribeEvent )
  {
    switch ( msg.type )
    {
      case "chat_metadata":
        console.log( msg );
        break;
      case "user_message":
      case "assistant_message":
        if ( msg.type === "user_message" )
        {
          player.stop();
        }
        appendChatMessage( chatContainer, msg );
        break;
      case "audio_output":
        await player.enqueue( msg );
        break;
      case "user_interruption":
        console.log( "User interruption detected." );
        player.stop();
        break;
      case "error":
        console.error( `EVI Error: Code=${ msg.code }, Slug=${ msg.slug }, Message=${ msg.message }` );
        break;
    }
  }

  function handleError ( err: Event | Error )
  {
    console.error( "Socket error:", err );
  }

  function handleClose ( e: unknown )
  {
    console.log( "Socket closed:", e );
    disconnect();
  }

  function connect ()
  {
    if ( socket && socket?.readyState < WebSocket.CLOSING ) return;
    setConnected( true );

    try
    {
      const handlers = {
        open: handleOpen,
        message: handleMessage,
        error: handleError,
        close: handleClose,
      };

      socket = connectEVI( apiKey, handlers, configId );
    } catch ( err )
    {
      console.error( "Failed to connect EVI:", err );
      socket = null;
      setConnected( false );
    }
  }

  function disconnect ()
  {
    if ( socket && socket.readyState < WebSocket.CLOSING ) socket.close();
    socket = null;

    recorder?.stream.getTracks().forEach( ( t ) => t.stop() );
    recorder = null;

    player?.dispose();

    setConnected( false );
  }

  // Export for testing
  if ( typeof window === "undefined" || import.meta.env?.VITEST )
  {
    ( globalThis as any ).__connectEVI = connect;
    ( globalThis as any ).__disconnectEVI = disconnect;
    ( globalThis as any ).__getEVISocket = () => socket;
  }

  startBtn?.addEventListener( "click", connect );
  stopBtn?.addEventListener( "click", disconnect );
  setConnected( false );
} )();
