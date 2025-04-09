<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface | Python Chat History</h1>
  <p>
    <strong>Fetch Chat Events, Generate a Transcript, and Identify Top Emotions</strong>
  </p>
</div>

## Overview

**This project demonstrates how to:**

- Retrieve all chat events for a specified Chat ID from Hume's [Empathic Voice Interface (EVI)](https://dev.hume.ai/docs/empathic-voice-interface-evi/overview) using the [Python SDK](https://github.com/HumeAI/hume-python-sdk).
- Parse user and assistant messages to produce a formatted chat transcript.
- Compute the top three average emotion scores from user messages.

**Key Features:**

- **Transcript generation:** Outputs a human-readable `.txt` file capturing the conversation between user and assistant.
- **Top 3 emotions:** Identifies the three emotions with the highest average scores across all user messages.

## Instructions

1. Clone this examples repository:

   ```shell
   git clone https://github.com/humeai/hume-api-examples
   cd hume-api-examples/evi/evi-python-chat-history
   ```

2. Verify Poetry is installed (version 1.7.1 or higher):

   Check your version:

   ```sh
   poetry --version
   ```

   If you need to update or install Poetry, follow the instructions on the [official Poetry website](https://python-poetry.org/).

3. Set up your API key:

   You must authenticate to use the EVI API. Your API key can be retrieved from the [Hume AI platform](https://platform.hume.ai/settings/keys). For detailed instructions, see our documentation on [getting your api keys](https://dev.hume.ai/docs/introduction/api-key).

   Place your API key in a `.env` file at the root of your project.

   ```shell
   echo "HUME_API_KEY=your_api_key_here" > .env
   ```

   You can copy the `.env.example` file to use as a template.

4. Specify the Chat ID:

   In the main function within `main.py`, set the `CHAT_ID` variable to the target conversation ID:

   ```python
   async def main():
       # Replace with your actual Chat ID
       CHAT_ID = "<YOUR_CHAT_ID>"
       # ...
   ```

   This determines which Chat's events to fetch and process.

5. Install dependencies:

   ```sh
   poetry install
   ```

6. Run the project:

   ```sh
   poetry run python main.py
   ```

   #### What happens when run:

   - The script fetches all events for the specified `CHAT_ID`.
   - It generates a `transcript_<CHAT_ID>.txt` file containing the user and assistant messages with timestamps.
   - It logs the top 3 average emotions to the console:

   ```sh
   Top 3 Emotions: {'Joy': 0.7419108072916666, 'Interest': 0.63111979166666666, 'Amusement': 0.63061116536458334}
   ```

   (These keys and scores are just examples; the actual output depends on the Chat's content.)
