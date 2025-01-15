import express from "express";
import dotenv from "dotenv";
import { HumeClient } from "hume";
import fs from "fs/promises";
import {
  WebhookEvent,
} from "hume/api/resources/empathicVoice";
import {
  getChatTranscript,
  validateHmacSignature,
  validateTimestamp,
} from "./util";

dotenv.config();
const app = express();
const PORT = 5000;

app.use(
  (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ): void => {
    if (req.originalUrl === "/hume-webhook") {
      next();
    } else {
      express.json()(req, res, next);
    }
  },
);

app.post(
  "/hume-webhook",
  // Stripe requires the raw body to construct the event
  express.raw({ type: "application/json" }),
  async (req, res) => {
    validateHmacSignature(req.body, req.headers);
    validateTimestamp(req.headers);

    const event = JSON.parse(req.body) as WebhookEvent;

    try {
      if (event.eventName === "chat_started") {
        console.log("Processing chat_started event:", event);

        // Add your logic for handling chat_started events here
      } else if (event.eventName === "chat_ended") {
        console.log("Processing chat_ended event:", event);
        await getChatTranscript(event.chatId);

        // Add your your logic for handling chat_ended events here
      } else {
        res.status(400).json({ error: "Unsupported event type" });
        return;
      }

      res.json({ status: "success", message: `${event.eventName} processed` });
    } catch (error) {
      console.error("Error processing event:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
