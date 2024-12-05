import fs from "fs"; 
import dotenv from "dotenv";
import { HumeClient } from "hume";
import { ReturnChatEvent, EmotionScores } from "hume/api/resources/empathicVoice";

dotenv.config();

/**
 * The main entry point of the script.
 * 
 * Steps:
 *  1. Fetch all chat events for the specified chat ID.
 *  2. Generate a transcript from user and assistant messages.
 *  3. Save the transcript to a local text file.
 *  4. Calculate and log the top 3 emotions (by average score) from user messages.
 */
async function main(): Promise<void> {
  const CHAT_ID = "<YOUR_CHAT_ID>"; // Replace with your actual Chat ID

  try {
    const chatEvents = await fetchAllChatEvents(CHAT_ID);

    // Generate a transcript string from the fetched chat events
    const transcript = generateTranscript(chatEvents);

    // Define the transcript file name
    const transcriptFileName = `transcript_${CHAT_ID}.txt`;

    // Write the transcript to a text file
    try {
      fs.writeFileSync(transcriptFileName, transcript, "utf8");
      console.log(`Transcript saved to ${transcriptFileName}`);
    } catch (fileError) {
      console.error(`Error writing to file ${transcriptFileName}:`, fileError);
    }

    // Calculate and log the top 3 emotions (on average)
    const topEmotions = getTopEmotions(chatEvents);
    console.log("Top 3 Emotions:", topEmotions);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();

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
  const chatEventsIterator = await client.empathicVoice.chats.listChatEvents(chatId, {
    pageNumber: 0, // Start from the first page
  });

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
    (chatEvent) => chatEvent.type === "USER_MESSAGE" || chatEvent.type === "AGENT_MESSAGE"
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

/**
 * Calculates the top 3 average emotion scores from user messages within the provided chat events.
 *
 * Steps:
 *  1. Filters the chatEvents for user messages that contain emotion features.
 *  2. Uses the first user message's emotion features to dynamically infer emotion keys at runtime.
 *  3. Parses and sums the scores for each emotion across all user messages.
 *  4. Computes average scores and returns them as a Partial<EmotionScores> containing only the top 3.
 *
 * @param chatEvents The chat events to analyze.
 * @returns The top 3 emotions and their average scores.
 */
function getTopEmotions(chatEvents: ReturnChatEvent[]): Partial<EmotionScores> {
  // Extract user messages that have emotion features
  const userMessages = chatEvents.filter(
    (event) => event.type === "USER_MESSAGE" && event.emotionFeatures
  );

  const totalMessages = userMessages.length;

  // Infer emotion keys from the first user message
  const firstMessageEmotions = JSON.parse(userMessages[0].emotionFeatures!) as EmotionScores;
  const emotionKeys = Object.keys(firstMessageEmotions) as (keyof EmotionScores)[];

  // Initialize sums for all emotions to 0 (no extra type assertions needed)
  const emotionSums: Record<keyof EmotionScores, number> = Object.fromEntries(
    emotionKeys.map((key) => [key, 0])
  ) as Record<keyof EmotionScores, number>;

  // Accumulate emotion scores from each user message
  for (const event of userMessages) {
    const emotions = JSON.parse(event.emotionFeatures!) as EmotionScores;
    for (const key of emotionKeys) {
      emotionSums[key] += emotions[key];
    }
  }

  // Compute average scores for each emotion
  const averageEmotions = emotionKeys.map((key) => ({
    emotion: key,
    score: emotionSums[key] / totalMessages,
  }));

  // Sort by average score (descending) and pick the top 3
  averageEmotions.sort((a, b) => b.score - a.score);
  const top3 = averageEmotions.slice(0, 3);

  // Build a Partial<EmotionScores> with only the top 3 emotions
  const result: Partial<EmotionScores> = {};
  for (const { emotion, score } of top3) {
    result[emotion] = score;
  }

  return result;
}