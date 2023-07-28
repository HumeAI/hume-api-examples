import { sleep } from "../utilities/asyncUtilities";

export class AudioRecorder {
  private recorder;
  private mediaStream;

  private constructor(recorder: MediaRecorder, mediaStream: MediaStream) {
    this.recorder = recorder;
    this.mediaStream = mediaStream;
  }

  static async create(): Promise<AudioRecorder> {
    const mediaOptions = { video: false, audio: true };
    const mediaStream = await navigator.mediaDevices.getUserMedia(mediaOptions);
    const recorder = new MediaRecorder(mediaStream);
    return new AudioRecorder(recorder, mediaStream);
  }

  async stopRecording() {
    this.mediaStream.getTracks().forEach((track) => {
      track.stop();
    });
  }

  record(length: number): Promise<Blob> {
    return new Promise(async (resolve: (blob: Blob) => void, _) => {
      this.recorder.ondataavailable = (blobEvent) => {
        resolve(blobEvent.data);
      };

      if (this.recorder.state !== "recording") this.recorder.start();
      await sleep(length);
      if (this.recorder.state === "recording") this.recorder.stop();
    });
  }
}
