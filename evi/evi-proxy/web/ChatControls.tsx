import React from "react";
import { useVoice } from "@humeai/voice-react";

export default function ChatControls() {
  const { disconnect, status, isMuted, unmute, mute } = useVoice();

  if (status.value !== "connected") {
    return null;
  }

  const toggle = () => {
    if (isMuted) {
      unmute();
    } else {
      mute();
    }
  };
  const label = isMuted ? "Unmute" : "Mute";

  return (
    <div>
      <div>
        <button onClick={toggle}>{label}</button>
        <button onClick={() => disconnect()}> End Call</button>
      </div>
    </div>
  );
}
