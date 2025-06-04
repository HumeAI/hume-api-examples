/// <reference lib="dom" />
import React, { useCallback, useState } from "react";
import type { AppEvent } from "../shared/types";
import { ERROR_CODES, ERROR_CODE_KEYS, CLOSE_TYPES } from "../shared/types";
import { useProxyState } from "./useProxyState";

export const WebsocketControls: React.FC = () => {
  const state = useProxyState();

  const [path, setPath] = useState("recording.jsonl");
  const [selectedError, setSelectedError] = useState("");

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
  const handleStartPlayback = () => {
    if (!path.trim()) {
      alert("Please enter a script file path");
      return;
    }
    sendEvent({
      type: "provide_load_path",
      filePath: path,
    });
  };
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
  const handleCancelLoading = () => sendEvent({ type: "cancel_loading" });
  const handleSimulateClose = (
    closeType: "abnormal_disconnect" | "intentional_close",
  ) => {
    sendEvent({ type: "simulate_close", closeType });
  };
  const handleSimulateError = (errorCode: string, shouldClose: boolean) => {
    sendEvent({ type: "simulate_error", errorCode, shouldClose });
  };
  const handleSimulateSelected = () => {
    if (!selectedError) return;
    if (CLOSE_TYPES.includes(selectedError as (typeof CLOSE_TYPES)[number])) {
      handleSimulateClose(selectedError as (typeof CLOSE_TYPES)[number]);
    } else {
      const config = ERROR_CODES[selectedError as keyof typeof ERROR_CODES];
      handleSimulateError(selectedError, config.shouldClose);
    }
    setSelectedError("");
  };
  const isRecording = state.mode === "record";
  const isSaving = state.mode === "saving";
  const isPlayback = state.mode === "playback";
  const isLoading = state.mode === "loading";
  const showSaveControls =
    state.status === "disconnected" &&
    state.mode !== "playback" &&
    state.messages.length > 0;

  return (
    <div>
      <div>
        <div>
          <h2>Record Mode</h2>
          <button
            onClick={handleStartRecord}
            hidden={isRecording}
            disabled={state.mode !== "pending"}
          >
            Start Record Mode
          </button>
          <button onClick={handleQuit} hidden={!isRecording}>
            Stop Recording
          </button>
          {showSaveControls && (
            <div>
              <button onClick={handleSave} disabled={!isSaving}>
                Save to: {path}
              </button>
              <button onClick={handleDiscard} disabled={!isSaving}>
                Discard
              </button>
            </div>
          )}
        </div>

        <div>
          <h2>Playback Mode</h2>
          <button
            onClick={handleStartPlayback}
            disabled={state.mode !== "pending"}
            hidden={isPlayback || isLoading}
          >
            Load recording from {path}
          </button>
          <button onClick={handleQuit} hidden={!isPlayback}>
            Exit Playback
          </button>
          <button onClick={handleCancelLoading} hidden={!isLoading}>
            Cancel Loading
          </button>

          <div>
            <button
              onClick={handleNext}
              disabled={!isPlayback || state.status !== "connected"}
            >
              Next Message ({state.messages.length} remaining)
            </button>
            <div>
              <select
                value={selectedError}
                onChange={(e) => setSelectedError(e.target.value)}
              >
                <option value="">Select an error</option>
                <option value="abnormal_disconnect">
                  Abnormal Disconnect (1006)
                </option>
                <option value="intentional_close">
                  Intentional Close (1000)
                </option>
                {ERROR_CODE_KEYS.map((code) => {
                  const config = ERROR_CODES[code];
                  return (
                    <option key={code} value={code}>
                      {config.slug.replace(/_/g, " ")} ({code})
                    </option>
                  );
                })}
              </select>
              <button
                onClick={handleSimulateSelected}
                disabled={
                  !selectedError || !isPlayback || state.status !== "connected"
                }
              >
                Simulate
              </button>
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="path">Path to recording:</label>
          <input
            id="path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          />
        </div>

      </div>
    </div>
  );
};
