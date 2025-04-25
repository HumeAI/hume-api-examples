<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Expression Measurement | Sample Python Implementation</h1>
  <p>
    <strong>Analyze language using Hume's Python SDK.</strong>
  </p>
</div>

## Overview
This is a sample implementation of Hume's Expression Measurement using the Websocket interface in Hume's Python SDK. This example using the "language" model only, which is for analyzing the emotional content of of text.

See the [python-top-emotions batch example](../../batch/python-top-emotions) for how to process pre-recorded media files (images) using the *Batch* API, and see the [next-js-streaming-example](../next-js-streaming-example) for an example of how to use the Streaming API on the web to process live data coming from a webcam or microphone.

## Setup

1. Copy the `.env.example` file to `.env` and add your Hume API key:
   ```
   cp .env.example .env
   ```

2. Edit `.env` and replace `your_api_key_here` with your actual Hume API key

3. Create a virtual environment and install dependencies using `uv`:
   ```
   uv venv
   uv pip install -e .
   ```

## Usage

Run the example with `uv`:
```
uv run main.py
```

Or using standard Python:
```
python main.py
```

Type text and press Enter to analyze the emotions in the text. The example will display the emotion scores sorted from highest to lowest.

Type `exit` or press Ctrl+C to exit the application.

