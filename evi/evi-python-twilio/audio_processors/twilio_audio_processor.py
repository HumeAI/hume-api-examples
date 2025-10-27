import audioop
import base64
from asyncio import Queue
from typing import ClassVar, Dict, Any
import logging

from pydub import AudioSegment

logger = logging.getLogger(__name__)


class TwilioAudioProcessor:
    inbuffer: bytearray
    inbound_chunks_started: bool
    latest_inbound_timestamp: int
    # twilio sends audio data as 160 byte messages containing 20ms of audio each
    # we will buffer 20 twilio messages corresponding to 0.4 seconds of audio to improve throughput performance
    BUFFER_SIZE: ClassVar[int] = 20 * 160
    TWILIO_FRAME_RATE: ClassVar[int] = 8000
    ASSISTANT_FRAME_RATE: ClassVar[int] = 24000
    # (2 bytes = 16 bit) linear PCM 16-bit signed little-endian
    SAMPLE_WIDTH: ClassVar[int] = 2
    CHANNELS: ClassVar[int] = 1

    def __init__(self) -> None:
        self.inbuffer = bytearray(b"")
        self.inbound_chunks_started = False
        self.latest_inbound_timestamp = 0

    def fill_silence(self, current_timestamp: int) -> None:
        # fills in silence if there have been dropped packets
        if self.inbound_chunks_started:
            if self.latest_inbound_timestamp + 20 < current_timestamp:
                bytes_to_fill = 8 * (current_timestamp -
                                     (self.latest_inbound_timestamp + 20))
                # 0xff is silence for ulaw audio and there are 8 bytes per ms of data for our format (8 bit,8000Hz)
                self.inbuffer.extend(b"\xff" * bytes_to_fill)
        else:
            self.inbound_chunks_started = True
            self.latest_inbound_timestamp = current_timestamp
        self.latest_inbound_timestamp = current_timestamp

    def buffer_inbound_audio(self, twilio_media_payload: Dict[str, Any]) -> None:
        current_timestamp = int(twilio_media_payload["timestamp"])
        self.fill_silence(current_timestamp)

        # extend the inbound audio buffer with data
        self.inbuffer.extend(base64.b64decode(twilio_media_payload["payload"]))

    async def queue_twilio_audio(self, twilio_media_payload: Dict[str, Any], twilio_to_evi_queue: Queue) -> None:
        # Reference: https://github.com/deepgram-devs/deepgram-twilio-streaming-python/blob/master/twilio.py
        if twilio_media_payload.get("track") == "inbound":
            self.buffer_inbound_audio(twilio_media_payload)

        while len(self.inbuffer) >= self.BUFFER_SIZE:
            pcm_chunk = audioop.ulaw2lin(
                self.inbuffer[: self.BUFFER_SIZE], self.SAMPLE_WIDTH)
            asinbound = AudioSegment(
                pcm_chunk, sample_width=self.SAMPLE_WIDTH, frame_rate=self.TWILIO_FRAME_RATE, channels=self.CHANNELS
            )
            if asinbound.raw_data is not None:
                twilio_to_evi_queue.put_nowait(asinbound.raw_data)

            # clearing buffer
            self.inbuffer = self.inbuffer[self.BUFFER_SIZE:]
