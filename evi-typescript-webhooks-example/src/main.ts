console.log("Hello world");

import express from 'express';
import dotenv from 'dotenv';
import { HumeClient } from 'hume';

dotenv.config();
const app = express();
const PORT = 3000;

// Initialize Hume Client
const humeClient = new HumeClient({ apiKey : process.env.HUME_API_KEY!});

app.use(express.json());

// 1. Listen on Port 3000 /evi/webhooks
app.post('/evi/webhooks', async (req, res) => {
  try {
	// 2. Receive a Webhook event from evi when a chat ends
	const event = req.body;

	// 3. Parse the event and get the chat id
	const chatId = event.chat_id;

	// 4. Look up the chat from the Hume API and print the last three messages
	const chat = await humeClient.empathicVoice.chats.listChatEvents(chatId)
  console.log(chat);
	// const messages = chat.messages;

	// // Print the last three messages
	// const lastThreeMessages = messages.slice(-3);
	// lastThreeMessages.forEach(message => {
	//   console.log(message);
	// });

	res.status(200).send('Webhook received and processed');
  } catch (error) {
	console.error('Error processing webhook:', error);
	res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});