import fs from "fs"; 
import dotenv from "dotenv";
import { HumeClient } from "hume";
import { ReturnChatEvent } from 'hume/api/resources/empathicVoice';

dotenv.config();

/**
 * The main function to run the script.
 * It fetches all chat events for a given chat ID and saves the transcript to a text file.
 */
async function run() {
  const chatId = "<YOUR_CHAT_ID>"; // Replace with your actual Chat ID

  try {
    const chatEvents = await fetchAllChatEvents(chatId);
    parseAndSaveTranscript(chatId, chatEvents);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

run();

/**
 * Fetches all chat events for a given chat ID from the Hume API.
 *
 * This function utilizes the HumeClient to retrieve all chat events associated with the specified chat ID.
 * It handles pagination internally by iterating over all pages until all events have been retrieved.
 *
 * API Reference: https://dev.hume.ai/reference/empathic-voice-interface-evi/chats/list-chat-events
 *
 * @param {string} chatId - The unique identifier of the chat from which to fetch events.
 * @returns {Promise<ReturnChatEvent[]>} A promise that resolves to an array of chat events.
 *
 * @throws {Error} If the HUME_API_KEY is not set in the environment variables.
 */
async function fetchAllChatEvents(chatId: string): Promise<ReturnChatEvent[]> {
  const apiKey = process.env.HUME_API_KEY;

  if (!apiKey) {
    throw new Error("HUME_API_KEY is not set in the environment variables.");
  }

  // Instantiate Hume client
  const client = new HumeClient({ apiKey });
  const allChatEvents: ReturnChatEvent[] = [];

  // Get an iterator over all chat events
  const chatEventsIterator = await client.empathicVoice.chats.listChatEvents(chatId, {
    pageNumber: 0, // Start from the first page
  });

  // Iterate over all chat events and collect them into an array
  for await (const chatEvent of chatEventsIterator) {
    allChatEvents.push(chatEvent);
  }

  return allChatEvents;
}

/**
 * Parses a list of ReturnChatEvent objects into a formatted transcript and saves it to a text file.
 *
 * @param {string} chatId - The ID of the chat, used for naming the output file.
 * @param {ReturnChatEvent[]} chatEvents - An array of chat events to parse.
 */
function parseAndSaveTranscript(chatId: string, chatEvents: ReturnChatEvent[]): void {
  // Filter events to include only user and assistant messages
  const relevantChatEvents = chatEvents.filter(
    (chatEvent) => chatEvent.type === "USER_MESSAGE" || chatEvent.type === "AGENT_MESSAGE"
  );

  // Map events to formatted strings
  const transcriptLines = relevantChatEvents.map((chatEvent) => {
    const role = chatEvent.role === "USER" ? "User" : "Assistant";
    const timestamp = new Date(chatEvent.timestamp).toLocaleString(); // Format timestamp as a readable date and time

    return `[${timestamp}] ${role}: ${chatEvent.messageText}`;
  });

  // Join the lines into a single transcript string
  const transcript = transcriptLines.join("\n");

  // Define the filename
  const fileName = `transcript_${chatId}.txt`;

  // Write the transcript to a text file
  try {
    fs.writeFileSync(fileName, transcript, "utf8");
    console.log(`Transcript saved to ${fileName}`);
  } catch (error) {
    console.error(`Error writing to file ${fileName}:`, error);
  }
}