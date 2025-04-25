# Simple Hume Streaming API Example

This example demonstrates how to use the Hume Expression Measurement Streaming API with the language model. It provides a simple command-line interface to analyze emotions in text in real-time.

## Features

- Takes text input from standard input
- Streams the text to the Hume API for language emotion analysis
- Displays emotion scores in real-time on the console

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

## How it Works

The example uses the Hume Python SDK to establish a WebSocket connection to the Hume Expression Measurement Streaming API. It configures the connection to use the language model and streams text input for analysis. The API returns emotion scores, which are displayed on the console.