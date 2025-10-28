# Setup

1. Rename `.env.example` to `.env` and paste your [Hume API key](https://platform.hume.ai/settings/keys) there
2. Set up an [ngrok](https://ngrok.com/) account and add a auth token via terminal:
`ngrok config add-authtoken YOUR_NGROK_TOKEN`
3. Set up a [Twilio](https://www.twilio.com/) phone number ("Buy a number")
4. In Hume AI dashboard, go to [Tools](https://platform.hume.ai/evi/tools) and create a new tool called `supportAssistant`. Enter the following JSON under Parameters:
```
{
  "type": "object",
  "properties": {
    "ticket_id": {
      "type": "string",
      "description": "The unique identifier or number of the support ticket"
    }
  },
  "required": ["ticket_id"]
}
```

# Run the example

1. Run `ngrok http 5001` and copy the ngrok URL under "Forwarding"
2. (One-time action) In Twilio Console, go to Phone Numbers > Active Numbers, pick your number and go to Configure. Under "A call comes in", select Webhook, paste URL from step 3 into "URL" and add `/twiml` at the end of that URL
3. Run `python app.py` (make sure step 1 is still running in another terminal tab)
4. Call your Twilio number from a phone, and you should see the EVI and Twilio in the terminal. Tell the assistant an imaginary support ticket ID (e.g. 123), and it should tell you it has changed status from Pending to Resolved (you can customize that behavior in `tools.py`).