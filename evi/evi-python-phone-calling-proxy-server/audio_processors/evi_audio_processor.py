import audioop
import dataclasses
import io
import wave
from typing import Optional
import logging

import numpy as np
import scipy.signal as signal

logger = logging.getLogger(__name__)


@dataclasses.dataclass
class AudioProcessingConfig:
    # Default filter design taken from https://help.twilio.com/articles/223180588
    aa_filter_order: int = 5
    high_pass_filter_cutoff_freq: int = 200
    high_pass_filter_order: int = 2
    peak_filter_min_freq: int = 2000
    peak_filter_max_freq: int = 3000
    peak_filter_gain_db: int = 3
    notch_filter_freq: int = 1200
    notch_filter_bandwidth: int = 100


class EviAudioProcessor:
    audio_numpy_dtype: np.dtype
    target_frames: int
    config: AudioProcessingConfig

    def __init__(
        self, audio_numpy_dtype: np.dtype, target_frames: int, config: Optional[AudioProcessingConfig] = None
    ) -> None:
        self.audio_numpy_dtype = audio_numpy_dtype
        self.target_frames = target_frames
        self.config = config if config is not None else AudioProcessingConfig()

    def postprocess_audio(self, evi_audio: bytes) -> bytes:
        audio, original_fs = self._read_audio(evi_audio)
        audio = self._ensure_float(audio)

        if original_fs != self.target_frames and original_fs > self.target_frames:
            audio = self._resample_audio(
                audio=audio, original_fs=original_fs, target_fs=self.target_frames)

        audio = self._apply_filters(audio, self.target_frames)

        int16_audio = self._normalize_audio(audio)

        audio_bytes = int16_audio.tobytes()

        ulaw_audio = audioop.lin2ulaw(audio_bytes, 2)

        return ulaw_audio

    def _read_audio(self, evi_audio: bytes) -> tuple[np.ndarray, int]:
        byte_str_io = io.BytesIO(evi_audio)
        with wave.open(byte_str_io, "rb") as wav_file:
            n_frames = wav_file.getnframes()
            framerate = wav_file.getframerate()
            audio_bytes = wav_file.readframes(n_frames)

        audio = np.frombuffer(audio_bytes, dtype=self.audio_numpy_dtype)
        return audio, framerate

    def _ensure_float(self, audio: np.ndarray) -> np.ndarray:
        # We mainly do this to avoid rounding errors with integer math
        if self.audio_numpy_dtype.kind != "f":
            audio = audio.astype(np.float32)
        return audio

    def _resample_audio(self, audio: np.ndarray, original_fs: int, target_fs: int) -> np.ndarray:
        # Apply anti-aliasing low pass filter before resampling with polyphase filtering
        nyquist_freq = target_fs / 2.0
        cutoff_freq = nyquist_freq * 0.9

        sos = signal.butter(self.config.aa_filter_order, cutoff_freq,
                            btype="lowpass", fs=original_fs, output="sos")
        audio = signal.sosfilt(sos, audio)

        audio = signal.resample_poly(audio, up=target_fs, down=original_fs)

        return audio

    def _apply_filters(self, audio: np.ndarray, fs: int) -> np.ndarray:
        audio = self._high_pass_filter(audio, fs)
        audio = self._peak_filter(audio, fs)
        audio = self._notch_filter(audio, fs)
        return audio

    def _high_pass_filter(self, audio: np.ndarray, fs: int) -> np.ndarray:
        high_pass_sos = signal.butter(
            self.config.high_pass_filter_order,
            self.config.high_pass_filter_cutoff_freq,
            btype="highpass",
            fs=fs,
            output="sos",
        )
        return signal.sosfilt(high_pass_sos, audio)

    def _peak_filter(self, audio: np.ndarray, fs: int) -> np.ndarray:
        min_freq = self.config.peak_filter_min_freq
        max_freq = self.config.peak_filter_max_freq

        peak_center_freq = (min_freq + max_freq) / 2
        peak_bandwith = max_freq - min_freq
        peak_gain_db = self.config.peak_filter_gain_db

        q_peak = peak_center_freq / peak_bandwith
        peak_gain_linear = 10 ** (peak_gain_db / 20)
        peak_b, peak_a = signal.iirpeak(peak_center_freq, q_peak, fs=fs)
        peak_b += peak_gain_linear

        return signal.lfilter(peak_b, peak_a, audio)

    def _notch_filter(self, audio: np.ndarray, fs: int) -> np.ndarray:
        notch_freq = self.config.notch_filter_freq
        notch_bandwith = self.config.notch_filter_bandwidth
        q_notch = notch_freq / notch_bandwith
        notch_b, notch_a = signal.iirnotch(notch_freq, q_notch, fs=fs)

        return signal.lfilter(notch_b, notch_a, audio)

    def _normalize_audio(self, audio: np.ndarray) -> np.ndarray:
        max_int16 = np.iinfo(np.int16).max
        min_int16 = np.iinfo(np.int16).min
        MAX_ALLOWED_GAIN = 3.0

        max_abs_value = np.max(np.abs(audio))
        if max_abs_value > 0:
            normalization_factor = max_int16 / max_abs_value
            # So that for very silent audio, we don't amplify noise too much. Spoken audio likely shouldn't have a
            # 3x normalization factor
            audio = audio * min(normalization_factor, MAX_ALLOWED_GAIN)

        audio = np.clip(audio, min_int16, max_int16)
        return audio.astype(np.int16)
