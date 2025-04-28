import { useState, useRef } from "react";

export function useRecording(onTranscribed: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioPartsRef = useRef<BlobPart[]>([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      audioPartsRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioPartsRef.current.push(e.data);
      };
      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Could not start recording:", err);
    }
  }

  function stopRecordingAndTranscribe() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorder.stop();
    setRecording(false);
    setTranscribing(true);

    recorder.onstop = async () => {
      try {
        const blob = new Blob(audioPartsRef.current, {
          type: recorder.mimeType,
        });
        const arrayBuffer = await blob.arrayBuffer();

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: arrayBuffer,
        });
        if (!res.ok) {
          console.error("Transcription failed:", res.statusText);
          return;
        }
        const { text } = await res.json();
        onTranscribed(text);
      } catch (err) {
        console.error("Transcription error:", err);
      } finally {
        setTranscribing(false);
      }
    };
  }

  return {
    recording,
    transcribing,
    startRecording,
    stopRecordingAndTranscribe,
  };
}
