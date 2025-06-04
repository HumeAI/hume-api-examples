import React from "react";
import { useVoice } from "@humeai/voice-react";
import { useProxyState } from "./useProxyState";

export default function StartCall() {
  const { status, connect } = useVoice();
  const { mode } = useProxyState();

  if (status.value === "connected") {
    return null;
  }

  return (
    <div>
      <div>
        <h2>Start a Call</h2>
        <button
          onClick={() => {
            connect()
              .then(() => {})
              .catch((error) => console.error("Failed to connect:", error));
          }}
          disabled={mode !== "record" && mode !== "playback"}
        >
          Start Call
        </button>
      </div>
    </div>
  );
}
