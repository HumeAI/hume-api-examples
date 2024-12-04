"use client";

import { useVoice } from "@humeai/voice-react";

export function Call() {
  const { connect, disconnect, status } = useVoice();

  const handleClick = () => {
    if (status.value === "connected") {
      disconnect();
    } else {
      try {
        connect();
      } catch (error) {
        console.log("Error connecting:", error);
      }
    }
  };

  return (
    <div className="flex items-end justify-center">
      <button
        disabled={status.value === "connecting"}
        onClick={handleClick}
        className="btn btn-wide bg-slate-100 hover:bg-slate-100"
        style={{
          color: "black",
          position: "absolute", 
          bottom: "20px", 
        }}
      >
        {status.value === "connected" ? "End Call" : "Start Call"}
      </button>
    </div>
  );
}
