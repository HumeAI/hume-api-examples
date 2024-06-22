# evi-python-example

This is a short example of streaming a session with EVI using your device's microphone. Install the [dependencies](#dependencies) listed below and then run `python run_evi.py` to run the example.

NOTE: The Python SDK is currently supported on Mac and Linux, and not yet on Windows.

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

Python versions 3.9, 3.10, and 3.11 are supported. To use the basic functionality of `HumeVoiceClient`, `HumeBatchClient` or `HumeStreamClient`, there are no additional system dependencies. However, using the audio playback functionality of the EVI `MicrophoneInterface` may require a few extra dependencies depending on your operating system.

### 1. Environment Variables

The `python-dotenv` package can be used to load variables from a `.env` file into the process's environment. This practice is for configuration settings that shouldn't be hard-coded into the code, such as API keys.

To install it, run:

```bash
pip install python-dotenv
```

### 2. SDK module

The `hume` package contains the classes you need to use EVI, with and without message handling and audio playback.

To install it, run:
```bash
pip install "hume"
```

### 3. Audio playback

For audio playback, install the following system dependencies:

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

## Explanation of code in `run_evi.py`

### 1. Import libraries

First we import the required Hume libraries, as well as `load_dotenv` to enable the use of `.env` files to store environment variables, and asyncio for asynchronous functions calls.

```python
import os
from hume import HumeVoiceClient, MicrophoneInterface, VoiceSocket
from dotenv import load_dotenv
import asyncio
```

### 2. Authenticate and Connect

To get your API key,log into the portal and visit the [API keys page](https://beta.hume.ai/settings/keys).

`run_evi.py` uses an environment variable to access your API key and Secret key for token authentification.
> Learn more about authentication strategies with EVI [here](https://dev.hume.ai/docs/introduction/api-key).

Set the environment variable by editing the provided placeholder `.env` file, which is a persistent local store of your API key. To prevent API key leakage, it is set in the `.gitignore` file to not be committed to GitHub. The included `.env` file in this repo just reads:

  `HUME_API_KEY="PASTE_HUME_API_KEY_HERE"`
  `HUME_SECRET_KEY="PASTE_HUME_SECRET_KEY_HERE"`

> `.gitignore` is a hidden file, so on Mac you would need to hit `COMMAND-SHIFT .` to make it viewable in the finder. 

By using this method, environment variables are automatically set regardless of where the code is executed. As such, they are consistently available across different execution environments.

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

## Troubleshooting with the `sounddevice` library:

It may be the case that your system's default audio device is not the correct audio *capture* device. As such, you may use the following code to check.

```py
import sounddevice as sd
devices = sd.query_devices()
```
> Note that the provided `helper_functions.py` file contains methods `list_capture_devices()` and `list_audio_devices()` which you can use.

Once you've found the device in the list, identify its number and be sure to pass it into the MicrophoneInterface constructor.

```py
MicrophoneInterface.start(socket, device=CORRECT_DEVICE_NUMBER)
```

If this still does not work, try to set the default audio device to your chosen capture device using the following code:
```py
import sounddevice as sd
device_index = 0  # For example, use device index 0
sd.default.device = device_index
```