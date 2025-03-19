import { HumeClient } from 'hume';
import { ReturnChatEvent } from 'hume/api/resources/empathicVoice';
import path from 'path';
import fs from 'fs/promises';
import * as crypto from 'crypto';
import { IncomingHttpHeaders } from 'http';

/**
 * Retrieves the HUME_API_KEY from environment variables.
 *
 * This function ensures that the HUME_API_KEY is available and throws an error if it is not set.
 * It is used to authenticate requests to the Hume API.
 *
 * @returns The HUME_API_KEY as a string.
 * @throws If the HUME_API_KEY environment variable is not set.
 */
function getHumeApiKey(): string {
  const apiKey = process.env.HUME_API_KEY;
  if (!apiKey) {
    throw new Error("HUME_API_KEY is not set in the environment variables.");
  }
  return apiKey;
}

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
  const apiKey = getHumeApiKey();

  const client = new HumeClient({ apiKey });
  const allChatEvents: ReturnChatEvent[] = [];

  // Retrieve an async iterator over all chat events
  const chatEventsIterator = await client.empathicVoice.chats.listChatEvents(chatId);

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
    (chatEvent) => chatEvent.type === 'USER_MESSAGE' || chatEvent.type === 'AGENT_MESSAGE',
  );

  // Map each relevant event to a formatted line
  const transcriptLines = relevantChatEvents.map((chatEvent) => {
    const role = chatEvent.role === 'USER' ? 'User' : 'Assistant';
    const timestamp = new Date(chatEvent.timestamp).toLocaleString();
    return `[${timestamp}] ${role}: ${chatEvent.messageText}`;
  });

  // Join all lines into a single transcript string
  return transcriptLines.join('\n');
}

async function saveTranscriptToFile(transcript: string, chatId: string): Promise<void> {
  const directory = path.join(__dirname, 'transcripts');
  const transcriptFileName = path.join(directory, `transcript_${chatId}.txt`);
  
  try {
    // Ensure the directory exists; create it if not
    await fs.mkdir(directory, { recursive: true });

    // Write the transcript to the file
    await fs.writeFile(transcriptFileName, transcript, 'utf8');

    console.log(`Transcript saved to ${transcriptFileName}`);
  } catch (fileError) {
    console.error(`Error writing to file ${transcriptFileName}:`, fileError);
  }
}

export async function getChatTranscript(chatId: string): Promise<void> {
  const chatEvents = await fetchAllChatEvents(chatId);
  const transcript = generateTranscript(chatEvents);
  await saveTranscriptToFile(transcript, chatId);
}

export function validateHmacSignature(
  payload: string,
  headers: IncomingHttpHeaders,
): void {
  // Retrieve the timestamp from headers
  const timestamp = headers['x-hume-ai-webhook-timestamp'];
  if (!timestamp) {
    console.error('Error: Missing timestamp in the request headers.');
    throw new Error('Missing timestamp header');
  }

  // Retrieve the signature from headers
  const signature = headers['x-hume-ai-webhook-signature'] as string;
  if (!signature) {
    console.error('Error: Missing signature in the request headers.');
    throw new Error('Missing signature header');
  }

  // Retrieve the API key from environment variables
  const apiKey = getHumeApiKey();

  // Construct the message to be hashed by concatenating the payload and the timestamp
  const message = `${payload}.${timestamp}`;
  const expectedSig = crypto
    .createHmac('sha256', apiKey)
    .update(message)
    .digest('hex');

    
  // Compare the provided signature with the expected one using timing-safe comparison
  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedSigBuffer = Buffer.from(expectedSig, 'utf8');
  const validSignature =
    signatureBuffer.length === expectedSigBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedSigBuffer);

  // If the signatures do not match, throw an error
  if (!validSignature) {
    console.error(`Error: Invalid HMAC signature. Expected: ${expectedSig}, Received: ${signature}`);
    throw new Error('Invalid HMAC signature');
  }

  console.info('HMAC validation successful!');
}

export function validateTimestamp(headers: IncomingHttpHeaders): void {
  // Retrieve the timestamp from the headers
  const timestamp = headers['x-hume-ai-webhook-timestamp'] as string;
  if (!timestamp) {
    console.error('Error: Missing timestamp.');
    throw new Error('Missing timestamp');
  }

  // Attempt to parse the timestamp to a number
  let timestampInt: number;
  try {
    timestampInt = parseInt(timestamp, 10);
    if (isNaN(timestampInt)) {
      // parseInt can return NaN if the string isn't a valid integer
      throw new Error();
    }
  } catch (err) {
    console.error(`Error: Invalid timestamp format: ${timestamp}`);
    throw new Error('Invalid timestamp format');
  }

  // Get the current time in seconds
  const currentTime = Math.floor(Date.now() / 1000);

  // Check if the timestamp is more than 180 seconds behind the current time
  const TIMESTAMP_VALIDATION_WINDOW = 180;
  if (currentTime - timestampInt > TIMESTAMP_VALIDATION_WINDOW) {
    console.error(`Error: The timestamp on the request is too old. Current time: ${currentTime}, Timestamp: ${timestamp}`);
    throw new Error('The timestamp on the request is too old');
  }

  console.info('Timestamp validation successful!');
}
