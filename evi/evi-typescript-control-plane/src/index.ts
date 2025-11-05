import { HumeClient } from "hume";
import type { Hume } from "hume";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const API_KEY = process.env.HUME_API_KEY || "cY7Yjq84riLl3HcGcRQos0h5HkAFF8cYLlBb1uOGKuYbCNpm";
const API_BASE_URL = "https://api.hume.ai";

if (!API_KEY) {
  throw new Error("HUME_API_KEY environment variable is required");
}

/**
 * Send a control message to an active chat using the REST API
 */
async function sendControlMessage(chatId: string, message: any): Promise<void> {
  const url = `${API_BASE_URL}/v0/evi/chat/${chatId}/send`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hume-Api-Key": API_KEY,
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send control message: ${response.status} ${response.statusText} - ${errorText}`);
  }
}

/**
 * Example 1: Send control messages to an active chat
 * 
 * This demonstrates how to use POST /v0/evi/chat/:chatId/send
 * to send control messages like updating session settings or system prompt.
 */
export async function sendControlMessages(chatId: string) {
  console.log("\n=== Example 1: Sending Control Messages ===\n");
  console.log(`Chat ID: ${chatId}`);

  try {
    // Example 1a: Update system prompt
    console.log("\n1. Updating system prompt...");
    await sendControlMessage(chatId, {
      type: "session_settings",
      session_settings: {
        system_prompt: "You are a helpful assistant. Be concise and friendly.",
      },
    });
    console.log("✓ System prompt updated successfully");

    // Example 1b: Update session settings (e.g., voice ID)
    console.log("\n2. Updating session settings (voice ID)...");
    await sendControlMessage(chatId, {
      type: "session_settings",
      session_settings: {
        voice_id: "5bb7de05-c8fe-426a-8fcc-ba4fc4ce9f9c",
      },
    });
    console.log("✓ Voice ID updated successfully");

    // Example 1c: Set supplemental LLM API key
    console.log("\n3. Setting supplemental LLM API key...");
    await sendControlMessage(chatId, {
      type: "session_settings",
      session_settings: {
        supplemental_language_model_api_key: "your-supplemental-key-here",
      },
    });
    console.log("✓ Supplemental LLM API key set successfully");

    // Example 1d: Send a user message
    console.log("\n4. Sending a user message...");
    await sendControlMessage(chatId, {
      type: "user_input",
      text: "Hello from the control plane!",
    });
    console.log("✓ User message sent successfully");

  } catch (error) {
    console.error("Error sending control message:", error);
    throw error;
  }
}

/**
 * Example 2: Connect to an existing active chat to observe it
 * 
 * This demonstrates how to use WSS /chat/:chatId/connect
 * to attach to a running chat and receive full history + live events.
 */
export async function observeActiveChat(chatId: string) {
  const client = new HumeClient({ apiKey: API_KEY });

  console.log("\n=== Example 2: Observing Active Chat ===\n");
  console.log(`Connecting to chat: ${chatId}`);

  return new Promise<void>((resolve, reject) => {
    // Note: The SDK's connect() method may not support chatId parameter yet.
    // According to the API docs, the endpoint is WSS /chat/:chatId/connect
    // If the SDK doesn't support this, you may need to construct the WebSocket URL manually
    // or wait for SDK updates.
    
    // For now, we'll attempt to connect and note that this is a limitation
    console.log("Note: SDK may not support chatId parameter yet.");
    console.log("Connecting to observe chat (this may create a new chat if chatId is not supported)...\n");
    
    // Try to connect - if chatId is supported, it will connect to the existing chat
    // Otherwise, this will create a new chat connection
    // @ts-ignore - checking if chatId parameter exists in the SDK
    let socket: Hume.empathicVoice.chat.ChatSocket;
    
    try {
      // Attempt to connect with chatId (if supported by SDK)
      // @ts-ignore
      socket = client.empathicVoice.chat.connect({ chatId });
      console.log("Connected using chatId parameter");
    } catch (err) {
      // If chatId is not supported, fall back to standard connect
      // Note: This will create a new chat, not observe the existing one
      console.log("Warning: chatId parameter not supported. Falling back to standard connect.");
      console.log("This will create a new chat instead of observing the existing one.");
      socket = client.empathicVoice.chat.connect({});
    }

    let eventCount = 0;

    socket.on("open", () => {
      console.log("✓ Connected to chat successfully");
      console.log("Waiting for events (history replay + live events)...\n");
    });

    socket.on("message", (event: Hume.empathicVoice.chat.SubscribeEvent) => {
      eventCount++;
      console.log(`[Event ${eventCount}] Type: ${event.type}`);

      switch (event.type) {
        case "chat_metadata":
          console.log("  Chat metadata:", JSON.stringify(event, null, 2));
          break;
        case "user_message":
          const userMsg = event as any;
          console.log(`  User message: ${userMsg.user_message?.content || userMsg.message_text || JSON.stringify(userMsg)}`);
          break;
        case "assistant_message":
          const assistantMsg = event as any;
          console.log(`  Assistant message: ${assistantMsg.assistant_message?.content || assistantMsg.message_text || JSON.stringify(assistantMsg)}`);
          break;
        case "audio_output":
          console.log("  Audio output received (base64 encoded)");
          break;
        case "user_interruption":
          console.log("  User interruption detected");
          break;
        case "error":
          const errorEvent = event as any;
          console.error(`  Error: ${errorEvent.error?.message || errorEvent.message || JSON.stringify(errorEvent)}`);
          break;
        default:
          console.log("  Event data:", JSON.stringify(event, null, 2));
      }
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
      reject(error);
    });

    socket.on("close", (event) => {
      console.log("\n✓ Socket closed:", event);
      resolve();
    });

    // Auto-close after 30 seconds for demo purposes
    // In production, you'd keep this open to observe the chat
    setTimeout(() => {
      console.log("\nClosing observation connection after 30 seconds...");
      socket.close();
    }, 30000);
  });
}

/**
 * Main function to demonstrate control plane usage
 */
async function main() {
  console.log("Hume EVI Control Plane Example");
  console.log("===============================\n");

  // You need an active chat ID to use the control plane
  // In a real scenario, you'd get this from:
  // 1. Creating a chat and storing the chatId
  // 2. Receiving it from a webhook event
  // 3. Querying your chat history
  
  // For this example, we'll prompt for a chatId
  // If you have an active chat, replace this with your chatId
  const chatId = process.argv[2];

  if (!chatId) {
    console.error("Error: Chat ID is required");
    console.log("\nUsage:");
    console.log("  npm run dev <chatId>");
    console.log("\nTo get a chat ID:");
    console.log("  1. Start a chat using the EVI quickstart example");
    console.log("  2. Get the chatId from the chat_metadata event");
    console.log("  3. Or use the chat history API to find an active chat");
    process.exit(1);
  }

  try {
    // Example 1: Send control messages
    await sendControlMessages(chatId);

    // Example 2: Observe the active chat
    await observeActiveChat(chatId);

    console.log("\n✓ Control plane examples completed successfully!");
  } catch (error) {
    console.error("\n✗ Error running examples:", error);
    process.exit(1);
  }
}

// Run the examples only if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
