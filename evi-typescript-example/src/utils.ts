export function base64ToBlob(base64: string, contentType: string) {
  const binaryString = window.atob(base64);
  const bytes = new Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const byteArray = new Uint8Array(bytes);
  return new Blob([byteArray], { type: contentType });
}

export const checkForAudioTracks = (stream: MediaStream) => {
  const tracks = stream.getAudioTracks();

  if (tracks.length === 0) {
    throw new Error('No audio tracks');
  }

  if (tracks.length > 1) {
    throw new Error('Multiple audio tracks');
  }

  const track = tracks[0];
  if (!track) {
    throw new Error('No audio track');
  }
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

export function getSupportedMimeType():
  | { success: true; mimeType: MimeType }
  | { success: false; error: Error } {
  if (typeof MediaRecorder === 'undefined') {
    return {
      success: false,
      error: new Error('MediaRecorder is not supported'),
    };
  }

  if (MediaRecorder.isTypeSupported(MimeType.WEBM)) {
    return { success: true, mimeType: MimeType.WEBM };
  }

  if (MediaRecorder.isTypeSupported(MimeType.MP4)) {
    return { success: true, mimeType: MimeType.MP4 };
  }

  if (MediaRecorder.isTypeSupported(MimeType.WAV)) {
    return { success: true, mimeType: MimeType.WAV };
  }

  return {
    success: false,
    error: new Error('Browser does not support any compatible mime types'),
  };
}
