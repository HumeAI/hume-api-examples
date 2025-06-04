import { useState, useEffect } from "react";
import type { State } from "../shared/types";

export function useProxyState() {
  const [state, setState] = useState<State>({
    mode: "pending",
    status: "disconnected",
    messages: [],
  });

  useEffect(() => {
    const eventSource = new EventSource("/api");
    eventSource.onmessage = (event) => {
      try {
        const newState: State = JSON.parse(event.data);
        setState(newState);
      } catch (error) {
        console.error("Failed to parse SSE data:", error);
      }
    };
    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
    };
    return () => {
      eventSource.close();
    };
  }, []);

  return state;
}
