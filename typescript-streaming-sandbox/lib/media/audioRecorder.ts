import { sleep } from "../utilities/asyncUtilities";
import { fetchFile } from "@ffmpeg/util";

let ffmpeg: any = null;

export class AudioRecorder {
  private recorder;
  private mediaStream;

  private constructor(recorder: MediaRecorder, mediaStream: MediaStream) {
    this.recorder = recorder;
    this.mediaStream = mediaStream;
  }

  private static async convertAudio(blob: Blob): Promise<Blob> {
    await ffmpeg.load();

    const inputName = "input.mp4";
    const outputName = "output.webm";

    ffmpeg.writeFile(inputName, await fetchFile(blob));

    await ffmpeg.exec(["-i", inputName, "-c:a", "libopus", outputName]);

    const data = await ffmpeg.readFile(outputName);
    return new Blob([data], { type: "audio/webm" });
  }

  static async create(): Promise<AudioRecorder> {
    await AudioRecorder.loadFFmpeg();
    const mediaOptions = { video: false, audio: true };
    const mediaStream = await navigator.mediaDevices.getUserMedia(mediaOptions);
    const mimeType = AudioRecorder.getSupportedMimeType();
    const recorder = new MediaRecorder(mediaStream, { mimeType });
    return new AudioRecorder(recorder, mediaStream);
  }

  private static getSupportedMimeType(): string {
    const mimeTypes = ["audio/webm", "audio/webm;codecs=opus", "audio/mp4", "audio/mp4;codecs=aac"];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
    console.warn("No supported MIME type found. Defaulting to audio/webm.");
    return "audio/webm";
  }

  private static async loadFFmpeg() {
    if (typeof window === "undefined") return;
    if (!ffmpeg) {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile } = await import("@ffmpeg/util");

      ffmpeg = new FFmpeg();
      ffmpeg.fetchFile = fetchFile;

      await ffmpeg.load();
    }
  }

  async stopRecording() {
    this.mediaStream.getTracks().forEach((track) => {
      track.stop();
    });
  }

  record(length: number): Promise<Blob> {
    return new Promise(async (resolve: (blob: Blob) => void, _) => {
      this.recorder.ondataavailable = async (blobEvent) => {
        let recordedBlob = blobEvent.data;

        if (recordedBlob.type === "audio/mp4") {
          recordedBlob = await AudioRecorder.convertAudio(recordedBlob);
        }

        resolve(recordedBlob);
      };

      if (this.recorder.state !== "recording") this.recorder.start();
      await sleep(length);
      if (this.recorder.state === "recording") this.recorder.stop();
    });
  }
}
