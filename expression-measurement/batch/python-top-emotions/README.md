<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Expression Measurement | Sample Python Implementation</h1>
  <p>
    <strong>Batch-analyze Facial Expressions using Hume's Python SDK.</strong>
  </p>
</div>

## Overview
This project features a sample implementation of Hume's Expression Measurement using Hume's Python SDK. The script demonstrates how to process facial expressions in media files, tracking emotions over time and identifying peak emotional states.

## Prerequisites

The Hume Python SDK supports Python versions `3.9`, `3.10`, `3.11`, and `3.12` on macOS, Linux, and Windows systems.

### Setting up a virtual environment (optional)

You can create a virtual environment using either `conda` from Miniconda or Anaconda, or the built-in `venv` module in Python. Below are instructions for both methods.

After activating the virtual environment using either method, you can proceed with the installation of dependencies.

#### Using `conda`
1. Install `conda` using [Miniconda](https://docs.anaconda.com/miniconda/), the free minimal installer for it.
2. Create a new virtual environment.
    ```bash
    # Create a new conda environment named 'hume-env' with a specific Python version
    conda create --name hume-env python=3.11
    ```
3. Activate the virtual environment.
    ```bash
    # Activate the conda environment
    conda activate hume-env
    ```

#### Using `venv`

To create a virtual environment with `venv`, run the following commands in your terminal:

1. Create a new virtual environment.
    ```bash
    # Create a virtual environment in the directory 'hume-env'
    python -m venv hume-env
    ```
2. Activate the virtual environment.
    ```bash
    # Activate the virtual environment
    source hume-env/bin/activate    # On Unix or MacOS
    .\hume-env\Scripts\activate     # On Windows
    ```

### Package Dependencies

#### Environment Variables

The `python-dotenv` package is used to load variables from a `.env` file into the process's environment. This practice is for configuration settings that shouldn't be hard-coded into the code, such as API keys.

To install it, run:

```bash
pip install python-dotenv
```

#### Hume SDK

The `hume` package contains Hume's Python SDK, including the functionality for Expression Measurement. To install it, run:

```bash
pip install hume
```

To get your API credentials, log into the Hume Platform and visit the [API keys page](https://platform.hume.ai/settings/keys).

Implement your credentials by editing the provided placeholder `.env.example` file:
1. Rename the file to `.env`
2. Place your API key inside

The `.env` file becomes a persistent local store of your API key. The `.gitignore` file contains local env file paths so that they are not committed to GitHub.

## Usage
This implementation demonstrates how to use Batch Expression Measurement to analyze facial expressions in media files. The script processes the media and provides:
- Top expressed emotions within a specified time range
- Emotions that peaked above a certain threshold
- Detailed job status and timing information

To run the project:
1. Create and activate a virtual environment (optional but recommended)
2. Install the required packages
3. Configure your API key in the `.env` file
4. Execute the script by running `python main.py`

The script will:
1. Initialize the Hume client with your API key
2. Submit a job to analyze the specified media file(s)
3. Poll for job completion with exponential backoff
4. Process and display the emotion analysis results