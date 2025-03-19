<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface | Sample Python Implementation</h1>
  <p>
    <strong>Jumpstart your development with Hume's Empathic Voice Interface!</strong>
  </p>
</div>

## Overview
This project features a sample implementation of Hume's [Empathic Voice Interface](https://dev.hume.ai/docs/empathic-voice-interface-evi/overview) using Hume's Python SDK.

## Prerequisites

The Hume Python SDK supports Python versions 3.9, 3.10, and 3.11 on macOS and Linux systems.

### Setting up a virtual environment (optional)

You can create a virtual environment using either `conda` from Miniconda or Anaconda, or the built-in `venv` module in Python. Below are instructions for both methods.

After activating the virtual environment using either method, you can proceed with the installation of dependencies.

#### Using `conda`
1. Install `conda` using [Miniconda](https://docs.anaconda.com/miniconda/), the free minimal installer for it.
2. Create a new virtual environment.
    ```bash
    # Create a new conda environment named 'evi-env' with a specific Python version
    conda create --name evi-env python=3.11
    ```
3. Activate the virtual environment.
    ```bash
    # Activate the conda environment
    conda activate evi-env
    ```

#### Using `venv`

To create a virtual environment with `venv`, run the following commands in your terminal:

1. Create a new virtual environment.
    ```bash
    # Create a virtual environment in the directory 'evi-env'
    python -m venv evi-env
    ```
2. Activate the virtual environment.
    ```bash
    # Activate the virtual environment
    source evi-env/bin/activate
    ```

### Package and system dependencies

Below are the necessary steps to install the required packages and system dependencies for using environment variables, EVI, and handling audio input/output.

#### Environment Variables

The `python-dotenv` package can be used to load variables from a `.env` file into the process's environment. This practice is for configuration settings that shouldn't be hard-coded into the code, such as API keys.

To install it, run:

```bash
pip install python-dotenv
```

To get your API credentials, log into the Hume Platform and visit the [API keys page](https://platform.hume.ai/settings/keys).

Implement your credentials by editing the provided placeholder `.env.example` file.
   1. Rename the file to `.env`.
   2. Place your API credentials inside.

Upon doing so, the `.env` file becomes a persistent local store of your API key, Secret key, and EVI config ID. The `.gitignore` file contains local env file paths so that they are not committed to GitHub.
   
(Note: `.env` is a hidden file so on Mac you would need to hit `COMMAND-SHIFT .` to make it viewable in the finder).

#### EVI and audio input/output

The `hume` package contains Hume's Python SDK, including the asynchronous WebSocket infrastructure for using EVI. To install it, run:

```bash
pip install "hume[microphone]"
```

For audio playback and processing, additional system-level dependencies are required. Below are download instructions for each supported operating system.

##### macOS

To ensure audio playback functionality, you will need to install `ffmpeg`, a powerful multimedia framework that handles audio and video processing.

One of the most common ways to install `ffmpeg` on macOS is by using [Homebrew](https://brew.sh/). Homebrew is a popular package manager for macOS that simplifies the installation of software by automating the process of downloading, compiling, and setting up packages.

To install `ffmpeg` using Homebrew, follow these steps:

1. Install Homebrew onto your system according to the instructions on the [Homebrew website](https://brew.sh/).

2. Once Homebrew is installed, you can install `ffmpeg` with:
    ```bash
    brew install ffmpeg
    ```

If you prefer not to use Homebrew, you can download a pre-built `ffmpeg` binary directly from the [FFmpeg website](https://ffmpeg.org/download.html) or use other package managers like [MacPorts](https://www.macports.org/).

##### Linux

On Linux systems, you will need to install a few additional packages to support audio input/output and playback:

- `libasound2-dev`: This package contains development files for the ALSA (Advanced Linux Sound Architecture) sound system.
- `libportaudio2`: PortAudio is a cross-platform audio I/O library that is essential for handling audio streams.
- `ffmpeg`: Required for processing audio and video files.

To install these dependencies, use the following commands:

```bash
sudo apt-get --yes update
sudo apt-get --yes install libasound2-dev libportaudio2 ffmpeg
```

##### Windows

Not yet supported.

## Usage
This minimal implementation of Hume's Empathic User Interface (EVI) demonstrates how to authenticate, connect to, and display output from the interface in a terminal application.

Below are the steps to run the project:
1. Create a virtual environment using venv, conda or other method.
2. Activate the virtual environment.
3. Install the required packages and system dependencies.
4. Execute the script by running `python quickstart.py`.
5. Terminate the script by pressing `Ctrl+C`.