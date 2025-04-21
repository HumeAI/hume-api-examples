<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface | Python Quickstart</h1>
  <p>
    <strong>Jumpstart your development with Hume's Empathic Voice Interface!</strong>
  </p>
</div>

## Overview

This project features a minimal implementation of Hume's [Empathic Voice Interface (EVI)](https://dev.hume.ai/docs/empathic-voice-interface-evi/overview) using Hume's [Python SDK](https://github.com/HumeAI/hume-python-sdk). It demonstrates how to authenticate, connect to, and display output from EVI in a terminal application.

See the [Quickstart guide](https://dev.hume.ai/docs/empathic-voice-interface-evi/quickstart/python) for a detailed explanation of the code in this project.

## Prerequisites

The Hume Python SDK supports Python versions `3.9`, `3.10`, and `3.11` on macOS and Linux systems.

It does not currently support Windows. Windows developers can use our [Python Raw API Example](/evi/python/evi-python-raw-api/README.md) to work directly with the [EVI WebSocket API](https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat).

## Setup Instructions

1. Clone this examples repository:

   ```shell
   git clone https://github.com/humeai/hume-api-examples
   cd hume-api-examples/evi/evi-python-quickstart
   ```

2. Set up a virtual environment (Optional):

   It's recommended to isolate dependencies in a virtual environment. Choose one of the following methods:

   - **Using `conda`** (requires [Miniconda](https://docs.anaconda.com/miniconda/) or [Anaconda](https://www.anaconda.com/)):

     ```bash
     conda create --name evi-env python=3.11
     conda activate evi-env
     ```

   - **Using built-in `venv`** (available with Python 3.3+):

     ```bash
     python -m venv evi-env
     source evi-env/bin/activate
     ```

   After activating the environment, proceed with installing dependencies.

3. Set up environment variables:

   This project uses `python-dotenv` to load your API credentials securely from a `.env` file.

   1. Install the package:

      ```bash
      pip install python-dotenv
      ```

   2. Copy the `.env.example` file to use as a template:

      ```shell
      cp .env.example .env
      ```

   3. Place your API keys inside:

      - Visit the [API keys page](https://platform.hume.ai/settings/keys) on the Hume Platform to retrieve your API keys. See our documentation on [getting your api keys](https://dev.hume.ai/docs/introduction/api-key).
      - Upon doing so, the `.env` file becomes a persistent local store of your API key, Secret key, and EVI config ID. The `.gitignore` file contains local env file paths so that they are not committed to GitHub.

   4. Create an EVI configuration and place its config ID inside:

      - See our [configuration guide](https://dev.hume.ai/docs/empathic-voice-interface-evi/configuration/build-a-configuration).

   (Note: `.env` is a hidden file so on Mac you would need to hit `COMMAND-SHIFT .` to make it viewable in the finder).

4. Install the required packages and system dependencies:

   The `hume` package contains Hume's Python SDK, including the asynchronous WebSocket infrastructure for using EVI. To install it, run:

   ```bash
   pip install "hume[microphone]"
   ```

   For audio playback and processing, additional system-level dependencies are required. Below are download instructions for each supported operating system:

   #### macOS

   To ensure audio playback functionality, you will need to install `ffmpeg`, a powerful multimedia framework that handles audio and video processing.

   One of the most common ways to install `ffmpeg` on macOS is by using [Homebrew](https://brew.sh/). Homebrew is a popular package manager for macOS that simplifies the installation of software by automating the process of downloading, compiling, and setting up packages.

   To install `ffmpeg` using Homebrew, follow these steps:

   1. Install Homebrew onto your system according to the instructions on the [Homebrew website](https://brew.sh/).

   2. Once Homebrew is installed, you can install `ffmpeg` with:
      ```bash
      brew install ffmpeg
      ```

   If you prefer not to use Homebrew, you can download a pre-built `ffmpeg` binary directly from the [FFmpeg website](https://ffmpeg.org/download.html) or use other package managers like [MacPorts](https://www.macports.org/).

   #### Linux

   On Linux systems, you will need to install a few additional packages to support audio input/output and playback:

   - `libasound2-dev`: This package contains development files for the ALSA (Advanced Linux Sound Architecture) sound system.
   - `libportaudio2`: PortAudio is a cross-platform audio I/O library that is essential for handling audio streams.
   - `ffmpeg`: Required for processing audio and video files.

   To install these dependencies, use the following commands:

   ```bash
   sudo apt-get --yes update
   sudo apt-get --yes install libasound2-dev libportaudio2 ffmpeg
   ```

   #### Windows

   Not yet supported.

## Run the project

Below are the steps to run the project:

1. Create a virtual environment using venv, conda or other method.
2. Activate the virtual environment.
3. Install the required packages and system dependencies.
4. Execute the script by running `python quickstart.py`.
5. Terminate the script by pressing `Ctrl+C`.
