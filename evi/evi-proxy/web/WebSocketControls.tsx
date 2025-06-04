/// <reference lib="dom" />
import React, { useCallback, useState } from "react";
import type { AppEvent } from "../shared/types";
import { ERROR_CODES, ERROR_CODE_KEYS } from "../shared/types";
import { useProxyState } from "./useProxyState";

export const WebsocketControls: React.FC = () => {
  const state = useProxyState();

  const [path, setPath] = useState("recording.jsonl");

  const sendEvent = useCallback(async (event: AppEvent) => {
    try {
      const response = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error("Event was not processed successfully");
      }
    } catch (error) {
      console.error("Failed to send event:", error);
    }
  }, []);

  // Proxy state is synchronized via useProxyState

  // Event handlers
  const handleStartRecord = () => sendEvent({ type: "start_record_mode" });
  const handleStartPlayback = () => sendEvent({ type: "start_loading_mode" });
  const handleNext = () => sendEvent({ type: "send_next_message" });
  const handleQuit = () => {
    if (state.mode === "record") {
      sendEvent({ type: "save_and_exit_record" });
    } else if (state.mode === "playback") {
      sendEvent({ type: "exit_playback" });
    }
  };
  const handleSave = () => {
    if (!path.trim()) {
      alert("Please enter a save path");
      return;
    }
    sendEvent({
      type: "provide_save_path",
      filePath: path,
    });
  };
  const handleDiscard = () => sendEvent({ type: "discard_recording" });
  const handleLoad = () => {
    if (!path.trim()) {
      alert("Please enter a script file path");
      return;
    }
    sendEvent({
      type: "provide_load_path",
      filePath: path,
    });
  };
  const handleCancelLoading = () => sendEvent({ type: "cancel_loading" });
  const handleSimulateClose = (closeType: "abnormal_disconnect" | "intentional_close") => {
    sendEvent({ type: "simulate_close", closeType });
  };
  const handleSimulateError = (errorCode: string, shouldClose: boolean) => {
    sendEvent({ type: "simulate_error", errorCode, shouldClose });
  };
  const isRecording = state.mode === "record";
  const isSaving = state.mode === "saving";
  const isPlayback = state.mode === "playback";
  const isLoading = state.mode === "loading";

  return (
    <div>
      <h1>Record/Playback</h1>
      <div>
        <div>
          <label htmlFor="path">Path to recording:</label>
          <input
            id="path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          />
        </div>

        <div>
          <h2>Record Mode</h2>
          <button onClick={handleStartRecord} disabled={state.mode !== "pending"}>
            Start Record Mode
          </button>
          <button onClick={handleQuit} disabled={!isRecording}>
            Stop Recording
          </button>
          <div>
            <button onClick={handleSave} disabled={!isSaving}>
              Save to: {path}
            </button>
            <button onClick={handleDiscard} disabled={!isSaving}>
              Discard
            </button>
          </div>
        </div>

        <div>
          <h2>Playback Mode</h2>
          <button
            onClick={handleStartPlayback}
            disabled={state.mode !== "pending"}
          >
            Start Playback Mode
          </button>
          <div>
            <button onClick={handleLoad} disabled={!isLoading}>
              Load from: {path}
            </button>
            <button onClick={handleCancelLoading} disabled={!isLoading}>
              Cancel Loading
            </button>
          </div>

          <div>
            <button
              onClick={handleNext}
              disabled={!isPlayback || state.status !== "connected"}
            >
              Next Message ({state.messages.length} remaining)
            </button>
            <div>
              <h4>Error Simulation:</h4>
              <div>
                <h5>Transport Errors:</h5>
                <button
                  onClick={() => handleSimulateClose("abnormal_disconnect")}
                  disabled={!isPlayback || state.status !== "connected"}
                >
                  Abnormal Disconnect (1006)
                </button>
                <button
                  onClick={() => handleSimulateClose("intentional_close")}
                  disabled={!isPlayback || state.status !== "connected"}
                >
                  Intentional Close (1000)
                </button>
              </div>
              <div>
                <h5>Inline Errors:</h5>
                {ERROR_CODE_KEYS.map((code) => {
                  const config = ERROR_CODES[code];
                  return (
                    <button
                      key={code}
                      onClick={() => handleSimulateError(code, config.shouldClose)}
                      disabled={!isPlayback || state.status !== "connected"}
                    >
                      {config.slug.replace(/_/g, " ")} ({code})
                    </button>
                  );
                })}
              </div>
            </div>
            <button onClick={handleQuit} disabled={!isPlayback}>
              Exit Playback
            </button>
          </div>
        </div>

        <div>Messages remaining: {state.messages.length}</div>
      </div>
    </div>
  );
};
