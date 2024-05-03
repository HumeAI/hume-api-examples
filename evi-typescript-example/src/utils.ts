/**
 * type safe getElement utility function
 *
 * @param id safe getElement utility function
 * @returns the HTML element if found
 */
export function getElementById<T extends HTMLElement>(id: string): T | null {
  const element = document.getElementById(id);
  return element as T | null;
}

/**
 * converts a Blob to a base64 encoded buffer (string)
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve: (value: string) => void, _) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (!reader.result) return;

      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };

    reader.readAsDataURL(blob);
  });
}

/**
 * converts base64 encoded buffer (string) to a Blob
 */
export function base64ToBlob(base64: string, contentType: string): Blob {
  const binaryString = window.atob(base64);
  const bytes = new Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const byteArray = new Uint8Array(bytes);
  return new Blob([byteArray], { type: contentType });
}

export const checkForAudioTracks = (stream: MediaStream): void => {
  const tracks = stream.getAudioTracks();

  if (tracks.length === 0) throw new Error('No audio tracks');

  if (tracks.length > 1) throw new Error('Multiple audio tracks');

  if (!tracks[0]) throw new Error('No audio track');
};

export const getAudioStream = async (): Promise<MediaStream> => {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
};

enum MimeType {
  WEBM = 'audio/webm',
  MP4 = 'audio/mp4',
  WAV = 'audio/wav',
}

type MimeTypeSuccessResult = { success: true; mimeType: MimeType };
type MimeTypeFailureResult = { success: false; error: Error };
type MimeTypeResult = MimeTypeSuccessResult | MimeTypeFailureResult;

export function getSupportedMimeType(): MimeTypeResult {
  if (typeof MediaRecorder === 'undefined') {
    return {
      success: false,
      error: new Error('MediaRecorder is not supported'),
    };
  }

  const compatibleMimeTypes = [MimeType.WEBM, MimeType.MP4, MimeType.WAV];
  const supportedMimeType = compatibleMimeTypes.find((type) =>
    MediaRecorder.isTypeSupported(type)
  );

  if (!supportedMimeType) {
    return {
      success: false,
      error: new Error('Browser does not support any compatible mime types'),
    };
  }

  return { success: true, mimeType: supportedMimeType };
}
