# evi-python-example

This is a short example of streaming a session with EVI using your device's microphone. Install the [dependencies](#dependencies) listed below and then run `python run-evi.py` to run the example.

NOTE: The Python SDK is currently supported on Mac and Linux, and not yet on Windows.

## Dependencies

Python versions 3.9, 3.10, and 3.11 are supported. To use the basic functionality of `HumeVoiceClient`, `HumeBatchClient` or `HumeStreamClient`, there are no additional system dependencies. However, using the audio playback functionality of the EVI `MicrophoneInterface` may require a few extra dependencies depending on your operating system.

### 1. Microphone

To use microphone functionality in the `MicrophoneInterface` as shown below on either Mac or Linux, run:

```bash
pip install "hume[microphone]"
```

### 2. Audio playback

For audio playback, install the following dependencies:

#### Mac

```bash
brew install ffmpeg
```

#### Linux

You will need to install the following dependencies:

- `libasound2-dev`
- `libportaudio2`

You can install them with:

```bash
sudo apt-get --yes update
sudo apt-get --yes install libasound2-dev libportaudio2 ffmpeg
```

#### Windows

Not yet supported.

## Explanation of code in `run-evi.py`

### 1. Import libraries

First we import the required Hume libraries, as well as `load_dotenv` to enable the use of `.env` files to store environment variables, and asyncio for asynchronous functions calls.

```python
import os
from hume import HumeVoiceClient, MicrophoneInterface
from dotenv import load_dotenv
import asyncio
```

### 2. Authenticate and Connect

In the `run-evi.py` code, the API key has been saved to an environment variable. Avoid hard coding secrets in your project to prevent them from being leaked. You can either set an environment variable like this prior to running the code:

`export HUME_API_KEY="PASTE_HUME_API_KEY_HERE"`

Or, you can edit the provided `.env` file (Note: it's a hidden file so on Mac you would need to hit `COMMAND-SHIFT .` to make them viewable in the finder). The `.env` file is a persistent local store of your API key, and it's set in the `.gitignore` file to not be committed to GitHub. The included `.env` file in this repo just reads:

`HUME_API_KEY="PASTE_HUME_API_KEY_HERE"`

and you can edit it to save your API key. This can be more convenient than using the `export` command above, since you don't have to run it every time you start a new terminal, and it works inside Jupyter notebooks.

To get your API key,log into the portal and visit the [API keys page](https://beta.hume.ai/settings/keys).

**NOTE:** Your API key is like your password. Do not post any code containing it to any public forum such as Discord, and do not commit it to GitHub.

```python
async def main() -> None:
  # Retrieve the Hume API key from the environment variables
  HUME_API_KEY = os.getenv("HUME_API_KEY")
  # Connect and authenticate with Hume
  client = HumeVoiceClient(HUME_API_KEY)

  # Start streaming EVI over your device's microphone and speakers
  async with client.connect() as socket:
      await MicrophoneInterface.start(socket)
```

#### Optional: Specify device

You can specify your microphone device using the `device` parameter. We can run the following command on Mac or Linux to view the available audio devices:

`python -c "import sounddevice; print(sounddevice.query_devices())"`

which might return a large or small list depending on what you have installed. An example output might be:

```bash
   0 DELL U2720QM, Core Audio (0 in, 2 out)
   1 I, Phone 15 Pro Max Microphone, Core Audio (1 in, 0 out)
>  2 Studio Display Microphone, Core Audio (1 in, 0 out)
   3 Studio Display Speakers, Core Audio (0 in, 8 out)
   4 MacBook Pro Microphone, Core Audio (1 in, 0 out)
<  5 MacBook Pro Speakers, Core Audio (0 in, 2 out)
   6 Pro Tools Audio Bridge 16, Core Audio (16 in, 16 out)
   7 Pro Tools Audio Bridge 2-A, Core Audio (2 in, 2 out)
   8 Pro Tools Audio Bridge 2-B, Core Audio (2 in, 2 out)
   9 Pro Tools Audio Bridge 32, Core Audio (32 in, 32 out)
  10 Pro Tools Audio Bridge 64, Core Audio (64 in, 64 out)
  11 Pro Tools Audio Bridge 6, Core Audio (6 in, 6 out)
  12 Apowersoft Audio Device, Core Audio (2 in, 2 out)
  13 ZoomAudioDevice, Core Audio (2 in, 2 out)
```

and if we want to use the MacBook Pro Microphone, we would change the line

`await MicrophoneInterface.start(socket)`

on line 14 of `main()` to

`await MicrophoneInterface.start(socket, device=4))`


### 3. Execute

Initialize, execute, and manage the lifecycle of the event loop in the asyncio-based application, making sure that the main() coroutine runs effectively and that the application shuts down cleanly after the coroutine finishes executing.

```python
asyncio.run(main())
```

## Putting it all together

Here is the complete code from the steps above to run this example:

```python
import os
from hume import HumeVoiceClient, MicrophoneInterface
from dotenv import load_dotenv
import asyncio

async def main() -> None:
  # Retrieve the Hume API key from the environment variables
  HUME_API_KEY = os.getenv("HUME_API_KEY")
  # Connect and authenticate with Hume
  client = HumeVoiceClient(HUME_API_KEY)

  # Start streaming EVI over your device's microphone and speakers 
  async with client.connect() as socket:
      await MicrophoneInterface.start(socket)
asyncio.run(main())
```
