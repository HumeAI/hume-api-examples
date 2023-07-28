export function blobToBase64(blob: Blob) {
  return new Promise((resolve: (value: string) => void, _) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      }
    };
    reader.readAsDataURL(blob);
  });
}

export function canvasToImageBlob(canvas: HTMLCanvasElement, format: string = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const handleBlob = (blob: Blob | null) => {
      if (blob) {
        resolve(blob);
      } else {
        reject("Could not parse blob");
      }
    };
    canvas.toBlob(handleBlob, format, 1);
  });
}
