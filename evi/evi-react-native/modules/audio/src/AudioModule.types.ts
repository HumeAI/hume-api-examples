export type MicrophoneMode = "N/A" | "Standard" | "Voice Isolation" | "Wide Spectrum";

export type AudioModuleEvents = {
  onAudioInput: (params: AudioEventPayload) => void;
  onError: (params: { error: string }) => void;
};

export type AudioEventPayload = {
  base64EncodedAudio: string;
};
