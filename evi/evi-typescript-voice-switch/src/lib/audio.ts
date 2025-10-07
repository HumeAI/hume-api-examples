import {
  convertBlobToBase64,
  ensureSingleValidAudioTrack,
  getAudioStream,
  getBrowserSupportedMimeType,
  MimeType,
} from "hume";
import type { ChatSocket } from "hume/api/resources/empathicVoice/resources/chat";

/**
 * Begins capturing microphone audio and streams it into the given EVI ChatSocket.
 *
 * This function:
 * 1. Prompts the user for microphone access and obtains a single valid audio track.
 * 2. Creates a MediaRecorder using the specified MIME type.
 * 3. Slices the audio into blobs at the given interval, converts each blob to a base64 string,
 *    and sends it over the provided WebSocket-like ChatSocket via `socket.sendAudioInput`.
 * 4. Logs any recorder errors to the console.
 *
 * @param socket - The Hume EVI ChatSocket to which encoded audio frames will be sent.
 * @param mimeType - The audio MIME type to use for the MediaRecorder (e.g., WEBM, OGG).
 * @param timeSliceMs - How often (in milliseconds) to emit audio blobs. Defaults to 80ms.
 *
 * @returns A MediaRecorder instance controlling the ongoing microphone capture.
 *          Call `.stop()` on it to end streaming.
 *
 * @throws {DOMException} If the user denies microphone access or if no audio track is available.
 * @throws {Error} If MediaRecorder cannot be constructed with the given MIME type.
 */
export async function startAudioCapture(
  socket: ChatSocket,
  timeSliceMs = 80
): Promise<MediaRecorder> {
  const mimeTypeResult = getBrowserSupportedMimeType();
  const mimeType = mimeTypeResult.success ? mimeTypeResult.mimeType : MimeType.WEBM;

  const micAudioStream = await getAudioStream();
  ensureSingleValidAudioTrack(micAudioStream);

  const recorder = new MediaRecorder(micAudioStream, { mimeType });
  recorder.ondataavailable = async (e: BlobEvent) => {
    if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
      const data = await convertBlobToBase64(e.data);
      socket.sendAudioInput({ data });
    }
  };
  recorder.onerror = (e) => console.error("MediaRecorder error:", e);
  recorder.start(timeSliceMs);

  return recorder;
}
