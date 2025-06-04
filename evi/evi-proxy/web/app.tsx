/// <reference lib="dom" />
import EVIChat from "./EVIChat";
import { WebsocketControls } from "./WebSocketControls";
import { createRoot } from "react-dom/client";

function App() {
  return (
    <div className="app-container">
      <h1>Evi Proxy</h1>
      <p>
        In "Record Mode", the proxy connects to api.hume.ai and records the
        incoming messages as it forwards them to a connected client. In
        "Playback Mode", the proxy loads a recording from a file and allows you
        to play them back to the connected client, as well as simulate error
        conditions.{" "}
      </p>
      <p>
        You can control the proxy through the CLI or through the controls below.
      </p>
      <WebsocketControls />
      <EVIChat />
    </div>
  );
}

// Initialize React app
const container = document.getElementById("app");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
