import { HumeClient } from 'hume';
import { type Hume } from 'hume';
import path from 'path';
import fs from 'fs/promises';
import * as crypto from 'crypto';
import { IncomingHttpHeaders } from 'http';

/**
 * Retrieves the HUME_WEBHOOK_SIGNING_KEY from environment variables.
 *
 * @returns The webhook signing key.
 * @throws If the environment variable is not set.
 */
function getWebhookSigningKey(): string {
  const signingKey = process.env.HUME_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    throw new Error("HUME_WEBHOOK_SIGNING_KEY is not set in the environment variables.");
  }
  return signingKey;
}

/**
 * Fetches all chat events for a given chat ID from the Hume API.
 *
 * @param client - The HumeClient instance.
 * @param chatId - The unique identifier of the chat.
 * @returns A promise that resolves to an array of chat events.
 */
async function fetchAllChatEvents(client: HumeClient, chatId: string): Promise<Hume.empathicVoice.ReturnChatEvent[]> {
  const allChatEvents: Hume.empathicVoice.ReturnChatEvent[] = [];
  const chatEventsIterator = await client.empathicVoice.chats.listChatEvents(chatId);

  for await (const chatEvent of chatEventsIterator) {
    allChatEvents.push(chatEvent);
  }

  return allChatEvents;
}

/**
 * Generates a formatted transcript string from user and assistant messages.
 *
 * @param chatEvents - An array of chat events to parse.
 * @returns A formatted transcript string.
 */
function generateTranscript(chatEvents: Hume.empathicVoice.ReturnChatEvent[]): string {
  const relevantChatEvents = chatEvents.filter(
    (chatEvent) => chatEvent.type === 'USER_MESSAGE' || chatEvent.type === 'AGENT_MESSAGE',
  );

  const transcriptLines = relevantChatEvents.map((chatEvent) => {
    const role = chatEvent.role === 'USER' ? 'User' : 'Assistant';
    const timestamp = new Date(chatEvent.timestamp).toLocaleString();
    return `[${timestamp}] ${role}: ${chatEvent.messageText}`;
  });

  return transcriptLines.join('\n');
}

/**
 * Saves a transcript string to a text file named by chat ID.
 */
async function saveTranscriptToFile(transcript: string, chatId: string): Promise<void> {
  const directory = path.join(__dirname, 'transcripts');
  const transcriptFileName = path.join(directory, `transcript_${chatId}.txt`);

  try {
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(transcriptFileName, transcript, 'utf8');
    console.log(`Transcript saved to ${transcriptFileName}`);
  } catch (fileError) {
    console.error(`Error writing to file ${transcriptFileName}:`, fileError);
  }
}

/**
 * Fetches chat events, generates a transcript, and saves it to a file.
 *
 * @param client - The HumeClient instance.
 * @param chatId - The unique identifier of the chat.
 */
export async function getChatTranscript(client: HumeClient, chatId: string): Promise<void> {
  const chatEvents = await fetchAllChatEvents(client, chatId);
  const transcript = generateTranscript(chatEvents);
  await saveTranscriptToFile(transcript, chatId);
}

/**
 * Validates the HMAC signature and timestamp of an incoming webhook request.
 * Ensures the request was sent by Hume and has not been tampered with or replayed.
 *
 * @param payload - The raw request payload as a string.
 * @param headers - The incoming request headers.
 * @throws If the signature is invalid, the timestamp is missing/stale, or the signing key is not set.
 */
export function validateWebhookHeaders(
  payload: string,
  headers: IncomingHttpHeaders,
): void {
  // Extract required headers
  const timestamp = headers['x-hume-ai-webhook-timestamp'] as string;
  if (!timestamp) {
    throw new Error('Missing timestamp header');
  }

  const signature = headers['x-hume-ai-webhook-signature'] as string;
  if (!signature) {
    throw new Error('Missing signature header');
  }

  // Validate HMAC signature
  const signingKey = getWebhookSigningKey();
  const message = `${payload}.${timestamp}`;
  const expectedSig = crypto
    .createHmac('sha256', signingKey)
    .update(message)
    .digest('hex');

  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedSigBuffer = Buffer.from(expectedSig, 'utf8');
  const validSignature =
    signatureBuffer.length === expectedSigBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedSigBuffer);

  if (!validSignature) {
    throw new Error('Invalid HMAC signature');
  }

  // Validate timestamp to prevent replay attacks
  const timestampInt = parseInt(timestamp, 10);
  if (isNaN(timestampInt)) {
    throw new Error('Invalid timestamp format');
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const TIMESTAMP_VALIDATION_WINDOW = 180;
  if (currentTime - timestampInt > TIMESTAMP_VALIDATION_WINDOW) {
    throw new Error('The timestamp on the request is too old');
  }
}

/**
 * Fetches the current weather for a given location using geocode and weather APIs.
 *
 * @param parameters - Stringified JSON with `location` and `format` fields.
 * @returns The current temperature (e.g., '70F').
 */
export const fetchWeather = async (parameters: string): Promise<string> => {
  const args = JSON.parse(parameters) as {
    location: string;
    format: "fahrenheit" | "celsius";
  };

  // Fetch latitude and longitude coordinates of location
  const locationURL: string = `https://geocode.maps.co/search?q=${args.location}&api_key=${process.env.GEOCODING_API_KEY}`;
  const locationResponse = await fetch(locationURL, { method: "GET" });
  const locationJson = (await locationResponse.json()) as {
    lat: string;
    lon: string;
  }[];
  const { lat, lon } = locationJson[0];

  // Fetch point metadata for location
  const pointMetadataURL: string = `https://api.weather.gov/points/${parseFloat(lat).toFixed(3)},${parseFloat(lon).toFixed(3)}`;
  const pointMetadataResponse = await fetch(pointMetadataURL, {
    method: "GET",
  });
  const pointMetadataJson = (await pointMetadataResponse.json()) as {
    properties: {
      gridId: string;
      gridX: number;
      gridY: number;
    };
  };
  const { gridId, gridX, gridY } = pointMetadataJson.properties;

  // Fetch current weather
  const currentWeatherURL: string = `https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}/forecast`;
  const currentWeatherResponse = await fetch(currentWeatherURL, {
    method: "GET",
  });
  const currentWeatherJson = (await currentWeatherResponse.json()) as {
    properties: {
      periods: Array<{
        temperature: number;
        temperatureUnit: string;
      }>;
    };
  };

  // Parse and format the temperature (e.g., '70F')
  const { temperature } = currentWeatherJson.properties.periods[0];
  const unit = args.format === "fahrenheit" ? "F" : "C";
  return `${temperature}${unit}`;
};

/**
 * Invokes the get_current_weather tool and sends the result back via the control plane.
 *
 * @param hume - The HumeClient instance.
 * @param chatId - The ID of the chat.
 * @param toolCallMessage - The tool call message containing name, ID, and parameters.
 */
export const fetchWeatherTool = async (
  hume: HumeClient,
  chatId: string,
  toolCallMessage: { name: string, toolCallId: string, parameters: string }
): Promise<void> => {
  const { name, toolCallId, parameters } = toolCallMessage;
  if (name !== "get_current_weather") return;

  try {
    const currentWeather = await fetchWeather(parameters);
    await hume.empathicVoice.controlPlane.send(chatId, {
      type: "tool_response",
      toolCallId,
      content: currentWeather,
    });
  } catch (error) {
    console.error("Error fetching weather:", error);
    await hume.empathicVoice.controlPlane.send(chatId, {
      type: "tool_error",
      toolCallId,
      content: "Error fetching weather",
      error: "WeatherFetchError",
    });
  }
};
