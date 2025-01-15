import { HumeClient } from "hume";
import { ReturnChatEvent } from "hume/api/resources/empathicVoice";
import fs from "fs/promises";
import * as crypto from "crypto";
import { IncomingHttpHeaders } from "http";

/**
 * Fetches all chat events for a given chat ID from the Hume API.
 *
 * This function utilizes the HumeClient to retrieve all chat events associated with the specified chat ID.
 * It internally handles pagination by iterating through all available pages until every event is retrieved.
 *
 * @param chatId The unique identifier of the chat for which to fetch events.
 * @returns A promise that resolves to an array of chat events.
 * @throws If the HUME_API_KEY environment variable is not set.
 */
async function fetchAllChatEvents(chatId: string): Promise<ReturnChatEvent[]> {
  const apiKey = process.env.HUME_API_KEY;

  if (!apiKey) {
    throw new Error("HUME_API_KEY is not set in the environment variables.");
  }

  const client = new HumeClient({ apiKey });
  const allChatEvents: ReturnChatEvent[] = [];

  // Retrieve an async iterator over all chat events
  const chatEventsIterator = await client.empathicVoice.chats.listChatEvents(
    chatId,
    {
      pageNumber: 0, // Start from the first page
    },
  );

  // Collect all events from the iterator
  for await (const chatEvent of chatEventsIterator) {
    allChatEvents.push(chatEvent);
  }

  return allChatEvents;
}

/**
 * Generates a formatted transcript string from user and assistant messages.
 *
 * This function filters chat events to include only user and assistant messages,
 * then formats each message with a timestamp and role.
 *
 * @param chatEvents An array of chat events to parse.
 * @returns A formatted transcript string.
 */
function generateTranscript(chatEvents: ReturnChatEvent[]): string {
  // Filter events for user and assistant messages
  const relevantChatEvents = chatEvents.filter(
    (chatEvent) =>
      chatEvent.type === "USER_MESSAGE" || chatEvent.type === "AGENT_MESSAGE",
  );

  // Map each relevant event to a formatted line
  const transcriptLines = relevantChatEvents.map((chatEvent) => {
    const role = chatEvent.role === "USER" ? "User" : "Assistant";
    const timestamp = new Date(chatEvent.timestamp).toLocaleString(); // Human-readable date/time
    return `[${timestamp}] ${role}: ${chatEvent.messageText}`;
  });

  // Join all lines into a single transcript string
  return transcriptLines.join("\n");
}
async function saveTranscriptToFile(
  transcript: string,
  chatId: string,
): Promise<void> {
  const transcriptFileName = `transcript_${chatId}.txt`;
  try {
    await fs.writeFile(transcriptFileName, transcript, "utf8");
    console.log(`Transcript saved to ${transcriptFileName}`);
  } catch (fileError) {
    console.error(`Error writing to file ${transcriptFileName}:`, fileError);
  }
}

export async function getChatTranscript(chatId: string): Promise<void> {
  const chatEvents = await fetchAllChatEvents(chatId);
  const transcript = generateTranscript(chatEvents);
  saveTranscriptToFile(transcript, chatId);
}

export function validateHmacSignature(
  payload: string,
  headers: IncomingHttpHeaders,
): void {
  // 1. Retrieve the timestamp from headers
  const timestamp = headers["X-Hume-AI-Webhook-Timestamp"];
  if (!timestamp) {
    console.error("Error: Missing timestamp in the request headers.");
    throw new Error("Missing timestamp header");
  }

  // 1. (continued) Retrieve the signature from headers
  const signature = headers["X-Hume-AI-Webhook-Signature"] as string;
  if (!signature) {
    console.error("Error: Missing signature in the request headers.");
    throw new Error("Missing signature header");
  }

  // 2. Retrieve the API key from environment variables
  const apiKey = process.env.HUME_API_KEY;
  if (!apiKey) {
    console.error("Error: HUME_API_KEY is not set in environment variables.");
    throw new Error("Missing API key");
  }

  // 3. Construct the message to be hashed by concatenating the payload and the timestamp
  const message = `${payload}.${timestamp}`;
  const expectedSig = crypto
    .createHmac("sha256", apiKey)
    .update(message)
    .digest("hex");

  // Debugging information: print out details of the validation
  console.log("Debugging HMAC Validation:");
  console.log("Payload:", payload);
  console.log("Timestamp:", timestamp);
  console.log("Generated Signature:", expectedSig);
  console.log("Received Signature:", signature);

  // 4. Compare the provided signature with the expected one using timing-safe comparison
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedSigBuffer = Buffer.from(expectedSig, "utf8");
  const validSignature =
    signatureBuffer.length === expectedSigBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedSigBuffer);

  // 5. If the signatures do not match, throw an error
  if (!validSignature) {
    console.error(
      `Error: Invalid HMAC signature. Expected: ${expectedSig}, Received: ${signature}`,
    );
    throw new Error("Invalid HMAC signature");
  }

  console.log("HMAC validation successful!");
}
export function validateTimestamp(headers: IncomingHttpHeaders): void {
  // 1. Retrieve the timestamp from the headers
  const timestamp = headers["X-Hume-AI-Webhook-Timestamp"] as string;
  if (!timestamp) {
    console.error("Error: Missing timestamp.");
    throw new Error("Missing timestamp");
  }

  // 2. Attempt to parse the timestamp to a number
  let timestampInt: number;
  try {
    timestampInt = parseInt(timestamp, 10);
    if (isNaN(timestampInt)) {
      // parseInt can return NaN if the string isn't a valid integer
      throw new Error();
    }
  } catch (err) {
    console.error(`Error: Invalid timestamp format: ${timestamp}`);
    throw new Error("Invalid timestamp format");
  }

  // 3. Get the current time in seconds
  const currentTime = Math.floor(Date.now() / 1000);

  // 4. Check if the timestamp is more than 180 seconds behind the current time
  if (currentTime - timestampInt > 180) {
    console.error(
      `Error: The timestamp on the request is too old. Current time: ${currentTime}, Timestamp: ${timestamp}`,
    );
    throw new Error("The timestamp on the request is too old");
  }

  console.log("Timestamp validation successful!");
}
