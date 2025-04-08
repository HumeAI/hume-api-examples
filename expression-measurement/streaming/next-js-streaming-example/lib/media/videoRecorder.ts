import { canvasToImageBlob } from "../utilities/blobUtilities";

type Size = {
  width: number;
  height: number;
};

export class VideoRecorder {
  private videoElement: HTMLVideoElement;
  private photoElement: HTMLCanvasElement;
  private imageSize: Size;
  private mediaStream: MediaStream;

  private constructor(
    videoElement: HTMLVideoElement,
    photoElement: HTMLCanvasElement,
    imageSize: Size,
    mediaStream: MediaStream
  ) {
    this.videoElement = videoElement;
    this.photoElement = photoElement;

    this.imageSize = imageSize;
    this.mediaStream = mediaStream;
  }

  static async create(videoElement: HTMLVideoElement, photoElement: HTMLCanvasElement) {
    const mediaOptions = { audio: false, video: true };
    const mediaStream = await navigator.mediaDevices.getUserMedia(mediaOptions);

    videoElement.srcObject = mediaStream;
    videoElement.play();

    const imageSize = await VideoRecorder.setVideoSize(videoElement, photoElement);
    return new VideoRecorder(videoElement, photoElement, imageSize, mediaStream);
  }

  async stopRecording() {
    this.mediaStream.getTracks().forEach((track) => {
      track.stop();
    });
  }

  private static setVideoSize(videoElement: HTMLVideoElement, photoElement: HTMLCanvasElement) {
    return new Promise((resolve: (size: Size) => void, _) => {
      videoElement.addEventListener(
        "canplay",
        () => {
          const videoWidth = 500;
          const videoHeight = (videoElement.videoHeight * videoWidth) / videoElement.videoWidth;

          videoElement.setAttribute("width", videoWidth.toString());
          videoElement.setAttribute("height", videoHeight.toString());
          photoElement.setAttribute("width", videoWidth.toString());
          photoElement.setAttribute("height", videoHeight.toString());

          resolve({ width: videoWidth, height: videoHeight });
        },
        false
      );
    });
  }

  async takePhoto(format: string = "image/png"): Promise<Blob> {
    const context = this.photoElement.getContext("2d");
    if (!context) {
      console.log("Could not get photo context");
      throw Error("Could not get graphics context from canvas");
    }

    this.photoElement.width = this.imageSize.width;
    this.photoElement.height = this.imageSize.height;
    context.translate(this.imageSize.width, 0);
    context.scale(-1, 1);
    context.drawImage(this.videoElement, 0, 0, this.imageSize.width, this.imageSize.height);

    return await canvasToImageBlob(this.photoElement, format);
  }
}
