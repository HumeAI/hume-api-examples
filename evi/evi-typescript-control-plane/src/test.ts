import { HumeClient } from "hume";
import type { Hume } from "hume";
import * as dotenv from "dotenv";
import { sendControlMessages, observeActiveChat } from "./index.js";

// Load environment variables
dotenv.config();

const API_KEY = process.env.HUME_API_KEY || "cY7Yjq84riLl3HcGcRQos0h5HkAFF8cYLlBb1uOGKuYbCNpm";

if (!API_KEY) {
  throw new Error("HUME_API_KEY environment variable is required");
}

/**
 * Start a chat and return the chatId
 * This creates a new chat connection and captures the chatId from chat_metadata
 * The connection is kept alive so the chat remains active for control plane testing
 */
async function startChatAndGetId(): Promise<{ chatId: string; socket: any }> {
  return new Promise<{ chatId: string; socket: any }>((resolve, reject) => {
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
          resolve({ chatId, socket });
        } else {
          console.error("Error: chatId not found in chat_metadata:", JSON.stringify(metadata, null, 2));
          reject(new Error("chatId not found in chat_metadata"));
        }
      } else {
        console.log(`  Received event: ${event.type}`);
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

    // Timeout after 15 seconds
    setTimeout(() => {
      if (!chatId) {
        socket.close();
        reject(new Error("Timeout waiting for chat_metadata"));
      }
    }, 15000);
  });
}

/**
 * Main test function
 */
async function main() {
  console.log("Hume EVI Control Plane Test");
  console.log("============================\n");

  let chatSocket: any = null;

  try {
    // Step 1: Start a chat and get the chatId
    console.log("Step 1: Starting a new chat...");
    const { chatId, socket } = await startChatAndGetId();
    chatSocket = socket; // Keep reference to keep chat alive

    console.log(`\nChat ID obtained: ${chatId}`);
    console.log("Keeping chat connection alive for control plane testing...\n");

    // Wait a moment for the chat to be fully initialized
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Test sending control messages
    console.log("\n" + "=".repeat(50));
    console.log("Step 2: Testing control plane - sending messages");
    console.log("=".repeat(50));
    
    try {
      await sendControlMessages(chatId);
    } catch (error) {
      console.error("Error testing control messages:", error);
      throw error;
    }

    // Step 3: Test observing the chat
    console.log("\n" + "=".repeat(50));
    console.log("Step 3: Testing control plane - observing chat");
    console.log("=".repeat(50));
    
    try {
      // Run observation for 10 seconds
      await Promise.race([
        observeActiveChat(chatId),
        new Promise(resolve => setTimeout(resolve, 10000)).then(() => {
          console.log("\nObservation test completed (10 second timeout)");
        })
      ]);
    } catch (error) {
      console.error("Error testing observation:", error);
      // Don't throw - observation might fail if SDK doesn't support chatId yet
    }

    console.log("\n" + "=".repeat(50));
    console.log("✓ Control plane test completed!");
    console.log("=".repeat(50));
    console.log("\nChat is still active. You can test more by running:");
    console.log(`  npm run dev ${chatId}`);
    console.log("\nClosing initial chat connection in 5 seconds...");

    // Keep the chat alive for a bit more, then close
    setTimeout(() => {
      if (chatSocket) {
        chatSocket.close();
        console.log("Initial chat connection closed.");
      }
      process.exit(0);
    }, 5000);

  } catch (error) {
    console.error("\n✗ Test failed:", error);
    if (chatSocket) {
      chatSocket.close();
    }
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);
