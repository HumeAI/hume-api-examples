import os
from hume import HumeVoiceClient, MicrophoneInterface
from dotenv import load_dotenv
import asyncio

async def main() -> None:
  # Retrieve any environment variables stored in the .env file
  load_dotenv()
  # Retrieve the Hume API key from the environment variables
  HUME_API_KEY = os.getenv("HUME_API_KEY")
  # Connect and authenticate with Hume
  client = HumeVoiceClient(HUME_API_KEY)

  # Start streaming EVI over your device's microphone and speakers 
  async with client.connect() as socket:
      await MicrophoneInterface.start(socket)
asyncio.run(main())
