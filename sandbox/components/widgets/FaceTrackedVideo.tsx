import { useEffect, useRef } from "react";

import { TrackedFace } from "../../lib/data/trackedFace";

type FaceTrackedVideoProps = {
  className?: string;
  trackedFaces: TrackedFace[];
  onVideoReady: (video: HTMLVideoElement) => void;
  width: number;
  height: number;
};

export function FaceTrackedVideo({ className, trackedFaces, onVideoReady, width, height }: FaceTrackedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  className = className || "";

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      console.error("Missing video element");
      return;
    }
    onVideoReady(videoElement);
  }, []);

  const canvasElement = canvasRef.current;
  const videoElement = videoRef.current;
  const graphics = canvasElement?.getContext("2d");

  if (!canvasElement) {
    console.info("Missing canvasElement");
  }
  if (!videoElement) {
    console.info("Missing videoElement");
  }
  if (!graphics) {
    console.info("Missing graphics");
  }

  if (canvasElement && videoElement && graphics) {
    canvasElement.width = videoElement.width = width;
    canvasElement.height = videoElement.height = height;
    graphics.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (trackedFaces.length > 0) {
      graphics.fillStyle = "rgb(40, 40, 40, 0.5)";
      graphics.fillRect(0, 0, canvasElement.width, canvasElement.height);
    }

    trackedFaces.forEach(async (trackedFace: TrackedFace) => {
      const bbox = trackedFace.boundingBox;
      const scale = 20;
      const b = { x: bbox.x - scale, y: bbox.y - scale, w: bbox.w + 2 * scale, h: bbox.h + 2 * scale };

      graphics.beginPath();

      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const rx = b.w / 2;
      const ry = b.h / 2;

      graphics.lineWidth = 5;
      graphics.strokeStyle = "rgb(250, 250, 250, 0.1)";
      graphics.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI * 2);
      graphics.stroke();

      graphics.globalCompositeOperation = "destination-out";
      graphics.fillStyle = "rgb(0, 0, 0, 1)";
      graphics.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI * 2);
      graphics.fill();
      graphics.globalCompositeOperation = "source-over";
    });
  }

  return (
      <div className={`relative h-[200px] w-full overflow-hidden rounded-lg border border-neutral-300 bg-black align-top shadow md:h-[355px] md:w-[500px] ${className}`}>
      <video className="absolute -scale-x-[1]" ref={videoRef} autoPlay playsInline></video>
      <canvas className="absolute" ref={canvasRef}></canvas>
    </div>
  );
}
