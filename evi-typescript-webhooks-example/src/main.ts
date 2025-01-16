import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { getChatTranscript, validateHmacSignature, validateTimestamp } from './util';
import { WebhookEvent } from "hume/serialization/resources/empathicVoice/types/WebhookEvent";

dotenv.config();

const app = express();
const PORT = 5000;

app.post(
  '/hume-webhook', 
  express.raw({ type: 'application/json' }), // for raw body parsing in support of HMAC validation
  async (req: Request, res: Response) => {
    const payloadStr = req.body.toString('utf8');

    // Validate the request headers to ensure security
    try {
      validateHmacSignature(payloadStr, req.headers);
      validateTimestamp(req.headers);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error(`[Header Validation] Failed: ${errorMessage}`);
      res.status(401).json({ error: "Failed to validate headers" });
      return;
    }
    
    // Parse the raw JSON body, it is safe to assume the payload received from Hume is valid JSON
    const event: WebhookEvent.Raw = JSON.parse(payloadStr);
    
    try {
      // Handle the specific event type
      switch (event.event_name) {
        case 'chat_started':
          console.info('Processing chat_started event:', event);
          // Add additional chat_started processing logic here
          break;
        
        case 'chat_ended':
          console.info("Processing chat_ended event:", event);
          // Fetch Chat events, construct a Chat transcript, and write transcript to a file
          await getChatTranscript(event.chat_id);
          // Add additional chat_ended processing logic here
          break;

        default:
          console.warn(`[Event Handling] Unsupported event type: '${event.event_name}'`);
          res.status(400).json({ error: `Unsupported event type: '${event.event_name}'` });
          return;
      }

      // Respond with success
      res.json({ status: "success", message: `${event.event_name} processed` });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error(`[Event Processing] Error: ${errorMessage}`);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});