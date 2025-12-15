<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface | Python Raw API Example</h1>
  <p>
    <strong>Jumpstart your development with Hume's Empathic Voice Interface!</strong>
  </p>
</div>

## Overview

This project features a minimal implementation of Hume's [Empathic Voice Interface (EVI)](https://dev.hume.ai/docs/empathic-voice-interface-evi/overview) using Hume's API with Python. It demonstrates how to authenticate, connect to, and display output from EVI in a terminal application.

## Setup Instructions

1. Clone this examples repository:

   ```shell
   git clone https://github.com/humeai/hume-api-examples
   cd hume-api-examples/evi/evi-python-raw-api
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

3. Install the required dependencies:

   #### Mac

   ```bash
   pip install -r requirements_mac.txt
   ```

   #### Linux

   ```bash
   pip install -r requirements_linux.txt
   ```

4. Set up environment variables:

   1. Copy the `.env.example` file to use as a template:

      ```shell
      cp .env.example .env
      ```

   2. Place your API keys inside:

      - Visit the [API keys page](https://app.hume.ai/keys) on the Hume Platform to retrieve your API keys. See our documentation on [getting your api keys](https://dev.hume.ai/docs/introduction/api-key).
      - Upon doing so, the `.env` file becomes a persistent local store of your API key, Secret key, and EVI config ID. The `.gitignore` file contains local env file paths so that they are not committed to GitHub.

   (Note: `.env` is a hidden file so on Mac you would need to hit `COMMAND-SHIFT .` to make it viewable in the finder).

## Run the project

```bash
cd src
python main.py
```
