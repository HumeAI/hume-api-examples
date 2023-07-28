import { useContext, useEffect, useRef, useState } from "react";

import { AuthContext } from "../menu/Auth";
import { Emotion } from "../../lib/data/emotion";
import { LanguagePrediction } from "../../lib/data/languagePrediction";
import { TextArea } from "../inputs/TextArea";
import { TopEmotions } from "./TopEmotions";
import { getApiUrlWs } from "../../lib/utilities/environmentUtilities";

export function LanguageWidgets() {
  const authContext = useContext(AuthContext);
  const socketRef = useRef<WebSocket | null>(null);
  const mountRef = useRef(true);
  const numReconnects = useRef(0);
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [status, setStatus] = useState("");
  const [text, setText] = useState("");
  const maxReconnects = 3;

  useEffect(() => {
    mountRef.current = true;
    connect();

    return () => {
      console.log("Tearing down component");
      stopEverything();
    };
  }, []);

  useEffect(() => {
    sendRequest();
  }, [text]);

  function connect() {
    const baseUrl = getApiUrlWs(authContext.environment);
    const socketUrl = `${baseUrl}/v0/stream/models?apikey=${authContext.key}`;

    console.log(`Connecting to websocket... (using ${socketUrl})`);
    setStatus(`Connecting to server...`);
    socketRef.current = new WebSocket(socketUrl);

    socketRef.current.onopen = socketOnOpen;
    socketRef.current.onmessage = socketOnMessage;
    socketRef.current.onclose = socketOnClose;
    socketRef.current.onerror = socketOnError;
  }

  async function socketOnOpen() {
    console.log("Connected to websocket");
    setStatus("");
    sendRequest();
  }

  async function socketOnMessage(event: MessageEvent) {
    setStatus("");
    const response = JSON.parse(event.data);
    console.log("Got response", response);
    const predictions: LanguagePrediction[] = response.language?.predictions || [];
    const warning = response.language?.warning || "";
    const error = response.error;
    if (error) {
      setStatus(error);
      console.error(error);
      stopEverything();
      return;
    }

    if (predictions.length === 0) {
      setStatus(warning.replace(".", ""));
      setEmotions([]);
    } else {
      setEmotions(predictions[0].emotions);
    }
  }

  async function socketOnClose(event: CloseEvent) {
    console.log("Socket closed");

    if (mountRef.current === true) {
      setStatus("Reconnecting");
      console.log("Component still mounted, will reconnect...");
      connect();
    } else {
      console.log("Component unmounted, will not reconnect...");
    }
  }

  async function socketOnError(event: Event) {
    console.error("Socket failed to connect: ", event);
    if (numReconnects.current > maxReconnects) {
      setStatus(`Failed to connect to the Hume API (${authContext.environment}).
      Please log out and verify that your API key is correct.`);
    } else {
      numReconnects.current++;
      console.warn(`Connection attempt ${numReconnects.current}`);
    }
  }

  function stopEverything() {
    console.log("Stopping everything...");
    mountRef.current = false;
    const socket = socketRef.current;
    if (socket) {
      console.log("Closing socket");
      socket.close();
      socketRef.current = null;
    } else {
      console.warn("Could not close socket, not initialized yet");
    }
  }

  async function sendRequest() {
    if (text === "") {
      setEmotions([]);
    }

    // Note: Temporary fix for bug where language model fails if
    // the input is just a single space (or a newline)
    if (text.trim() === "") {
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      console.log("No socket found");
      return;
    }

    if (socket.readyState === WebSocket.OPEN) {
      const requestData = JSON.stringify({
        data: text,
        models: {
          language: {
            granularity: "passage",
          },
        },
        raw_text: true,
      });
      socket.send(requestData);
    } else {
      console.log("Socket connection not open");
      socket.close();
    }
  }

  return (
    <div>
      <div className="md:flex">
        <TextArea
          className="mb-6 h-[355px] w-full sm:w-80 md:w-[500px]"
          text={text}
          placeholder="Start typing here!"
          onChange={setText}
        />
        <TopEmotions className="ml-10" emotions={emotions} />
      </div>

      <div className="pt-6">{status}</div>
    </div>
  );
}
