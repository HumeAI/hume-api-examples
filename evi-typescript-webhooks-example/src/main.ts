import express from 'express';
import dotenv from 'dotenv';
import { HumeClient } from 'hume';
import type Hume from 'hume'
import fs from 'fs/promises';
import { ReturnChatEvent } from 'hume/api/resources/empathicVoice';

dotenv.config();
const app = express();
const PORT = 3000;

// Initialize Hume Client
const humeClient = new HumeClient({ apiKey: process.env.HUME_API_KEY! });

app.use(express.json());

const handleChatStartedEvent = async (event: any) => {
	let label = "New"
	if (event.chat_start_type === 'resumed') {
		label = "Resumed"
	}
	console.log(`${label} chat ${event.chat_id} started at ${event.start_time}`);
}

async function fetchAllChatEvents(chatId: string): Promise<ReturnChatEvent[]> {
  const allChatEvents: ReturnChatEvent[] = [];

  const chatEventsIterator = await humeClient.empathicVoice.chats.listChatEvents(chatId, {
    pageNumber: 0,
  });

  for await (const chatEvent of chatEventsIterator) {
    allChatEvents.push(chatEvent);
  }

  return allChatEvents;
}

function generateTranscript(chatEvents: ReturnChatEvent[]): string {
  const relevantChatEvents = chatEvents.filter(
    (chatEvent) => chatEvent.type === "USER_MESSAGE" || chatEvent.type === "AGENT_MESSAGE"
  );

  const transcriptLines = relevantChatEvents.map((chatEvent) => {
    const role = chatEvent.role === "USER" ? "User" : "Assistant";
    const timestamp = new Date(chatEvent.timestamp).toLocaleString(); // Human-readable date/time
    return `[${timestamp}] ${role}: ${chatEvent.messageText}`;
  });

  return transcriptLines.join("\n");
}

const handleChatEndedEvent = async (event: any) => {
  const chatId = event.chat_id
  const chatEvents = await fetchAllChatEvents(chatId);
	console.log(`Chat ${event.chat_id} ended at ${event.end_time}`);

  // Generate a transcript string from the fetched chat events
  const transcript = generateTranscript(chatEvents);

  // Define the transcript file name
  const transcriptFileName = `transcript_${chatId}.txt`;

  // Write the transcript to a text file
  try {
    await fs.writeFile(transcriptFileName, transcript, "utf8");
    console.log(`Transcript saved to ${transcriptFileName}`);
  } catch (fileError) {
    console.error(`Error writing to file ${transcriptFileName}:`, fileError);
  }
}

app.post('/evi/webhooks', async (req, res) => {
	try {
		const event = req.body;
		switch (event.type) {
			case 'chat_started':
				await handleChatStartedEvent(event);
				break;
			case 'chat_ended':
				await handleChatEndedEvent(event);
				break;
			default:
				console.log('Unsupported event type:', event.type);
		}
		res.status(200).send('Webhook received and processed\n');
	} catch (error) {
		console.error('Error processing webhook:', error);
		res.status(500).send('Internal Server Error');
	}
});

app.listen(PORT, () => {
	console.log(`Server is listening on port ${PORT}`);
});
