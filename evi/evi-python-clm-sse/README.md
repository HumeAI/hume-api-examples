<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface | Custom Language Model SSE Client</h1>
  <p>
    <strong>Custom responses powered by your own language model</strong>
  </p>
</div>

## Overview

A Python client library for handling Server-Sent Events (SSE) with Hume Custom Language Models, specifically designed to work with OpenAI-compatible APIs.

## Features

- Server-Sent Events (SSE) client implementation
- Compatible with OpenAI-style streaming responses
- Support for custom language model endpoints
- Easy-to-use async interface

## Instructions

1. Clone this examples repository:

   ```shell
   git clone https://github.com/humeai/hume-api-examples
   cd hume-api-examples/evi/evi-python-clm-sse
   ```

2. Verify Poetry is installed (version 1.7.1 or higher):

   Check your version:

   ```sh
   poetry --version
   ```

   If you need to update or install Poetry, follow the instructions on the [official Poetry website](https://python-poetry.org/).

3. Install dependencies:

   ```sh
   poetry install
   ```

4. Run the server:
   ```sh
   poetry run python openai_sse.py
   ```

Spin it up behind ngrok and use the ngrok URL in your config.
