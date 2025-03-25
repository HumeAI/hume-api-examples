# devices.py

from typing import List, Tuple
from pyaudio import PyAudio

class AudioDevices:
    """
    A class to manage and select audio input and output devices using PyAudio.
    """

    @classmethod
    def list_audio_devices(
        cls, pyaudio: PyAudio
    ) -> Tuple[List[Tuple[int, str]], List[Tuple[int, str]]]:
        """
        List available audio input and output devices.

        Args:
            pyaudio (PyAudio): An instance of PyAudio to interact with the audio system.

        Returns:
            Tuple[List[Tuple[int, str]], List[Tuple[int, str]]]: A tuple containing two lists:
                - A list of tuples for input devices, each containing the device index, name, and default sample rate.
                - A list of tuples for output devices, each containing the device index and name.
        """
        # Get host API info and number of devices
        info = pyaudio.get_host_api_info_by_index(0)
        n_devices = info.get("deviceCount")

        input_devices = []
        output_devices = []

        # Iterate through all devices and classify them as input or output devices
        for i in range(n_devices):
            device = pyaudio.get_device_info_by_host_api_device_index(0, i)
            if device.get("maxInputChannels") > 0:
                input_devices.append(
                    (i, device.get("name"), int(device.get("defaultSampleRate")))
                )
            if device.get("maxOutputChannels") > 0:
                output_devices.append((i, device.get("name"), device))
                
        return input_devices, output_devices

    @classmethod
    def choose_device(cls, devices, device_type="input"):
        """
        Allow the user to select an audio device from a list of available devices.

        Args:
            devices (List[Tuple[int, str, int]]): A list of tuples representing the available devices.
            device_type (str, optional): The type of device to choose ('input' or 'output'). Defaults to 'input'.

        Returns:
            Tuple[int, int] or int: For input devices, returns a tuple containing the chosen device index and sample rate.
                                    For output devices, returns the chosen device index.
        """
        if not devices:
            print(f"No {device_type} devices found.")
            return None

        # Display available devices
        print(f"Available {device_type} devices:")
        for _, (device_index, name, sample_rate) in enumerate(devices):
            print(f"{device_index}: {name}")

        # Prompt the user to select a device by index
        while True:
            try:
                choice = int(input(f"Select {device_type} device by index: "))
                if choice in [d[0] for d in devices]:
                    if device_type == "input":
                        return choice, sample_rate
                    else:
                        return choice
                else:
                    print(
                        f"Invalid selection. Please choose a valid {device_type} device index."
                    )
            except ValueError:
                print("Please enter a numerical index.")
