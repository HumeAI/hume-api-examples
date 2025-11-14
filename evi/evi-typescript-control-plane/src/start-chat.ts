import { HumeClient } from "hume";
import type { Hume } from "hume";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const API_KEY = process.env.HUME_API_KEY || "cY7Yjq84riLl3HcGcRQos0h5HkAFF8cYLlBb1uOGKuYbCNpm";

if (!API_KEY) {
  throw new Error("HUME_API_KEY environment variable is required");
}

/**
 * Start a chat and return the chatId
 * This creates a new chat connection and captures the chatId from chat_metadata
 */
export async function startChatAndGetId(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const client = new HumeClient({ apiKey: API_KEY });
    const socket = client.empathicVoice.chat.connect({});

    let chatId: string | null = null;

    socket.on("open", () => {
      console.log("✓ Chat connection opened");
      console.log("Waiting for chat_metadata to get chatId...\n");
    });

    socket.on("message", (event: Hume.empathicVoice.chat.SubscribeEvent) => {
      if (event.type === "chat_metadata") {
        const metadata = event as any;
        chatId = metadata.chat_id || metadata.chatId;
        
        if (chatId) {
          console.log(`✓ Chat started! Chat ID: ${chatId}\n`);
          // Keep the socket open so the chat stays active
          resolve(chatId);
        } else {
          console.error("Error: chatId not found in chat_metadata:", metadata);
          reject(new Error("chatId not found in chat_metadata"));
        }
      } else {
        console.log(`Received event: ${event.type}`);
      }
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
      reject(error);
    });

    socket.on("close", () => {
      if (!chatId) {
        reject(new Error("Socket closed before chatId was received"));
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!chatId) {
        socket.close();
        reject(new Error("Timeout waiting for chat_metadata"));
      }
    }, 10000);
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startChatAndGetId()
    .then((chatId) => {
      console.log(`\nChat ID: ${chatId}`);
      console.log("\nUse this chatId to test the control plane:");
      console.log(`npm run dev ${chatId}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed to start chat:", error);
      process.exit(1);
    });
}
