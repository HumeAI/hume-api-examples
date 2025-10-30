# Description

This example uses Hume AI's Emphatic Voice Interface (EVI) to respond to phone calls via Twilio. The example includes a mock Tool call to update the user calling in on the status of their customer support request. EVI is able to parse the ticket ID from speech and make the tool call. [Learn more about tool calling with EVI here.](https://dev.hume.ai/docs/speech-to-speech-evi/features/tool-use)

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
5. In Hume AI dashboard, [create a new config](https://platform.hume.ai/evi/configs) and add the tool from step 4 to that config, save. Copy its ID.
6. In `app.py`, change the `config_id` on line 232 with the config ID from step 5.

# Run the example

1. Install dependencies with uv: `uv sync`
2. Run `ngrok http 5001` and copy the ngrok URL under "Forwarding"
3. (One-time action) In Twilio Console, go to Phone Numbers > Active Numbers, pick your number and go to Configure. Under "A call comes in", select Webhook, paste URL from step 3 into "URL" and add `/twiml` at the end of that URL
4. Start the app: `uv run python app.py` (make sure step 2 is still running in another terminal tab)
5. Call your Twilio number from a phone, and you should see the EVI and Twilio in the terminal. Tell the assistant an imaginary support ticket ID (e.g. 123), and it should tell you it has changed status from Pending to Resolved (you can customize that behavior in `tools.py`).