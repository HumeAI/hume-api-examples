<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface | Sample Implementation</h1>
  <p>
    <strong>Jumpstart your development with Hume's Empathic Voice Interface!</strong>
  </p>
</div>

## Overview

This project features a sample implementation of Hume's [Empathic Voice Interface](https://hume.docs.buildwithfern.com/docs/empathic-voice-interface-evi/overview) using Hume's API with Python in a terminal window.

## Setting up a virtual environment (optional)

Before you install the dependencies, you might want to create a virtual environment to isolate your package installations. To create a virtual environment, run the following commands in your terminal:

```bash
# Create a virtual environment in the directory 'evi-env'
python -m venv evi-env

# Activate the virtual environment
# On Mac/Linux:
source evi-env/bin/activate
```

After activating the virtual environment, you can proceed with the installation of dependencies as described below.

## Dependencies

In order to run it, you need to install the `requirements.txt` using `pip`:

### Mac

```bash
pip install -r requirements_mac.txt
```

### Linux

```bash
pip install -r requirements_linux.txt
```

## Environment variables

Either create a `.env` file or set environment variables for HUME_API_KEY and HUME_SECRET_KEY.

Example `.env` file:

```bash
HUME_API_KEY="<YOUR API KEY>"
HUME_SECRET_KEY="<YOUR SECRET KEY>"
```

Example terminal commands to set environment variables manually:

```bash
export HUME_API_KEY="<YOUR API KEY>"
export HUME_SECRET_KEY="<YOUR SECRET KEY>"
```

## Usage

```bash
cd src
python main.py
```
