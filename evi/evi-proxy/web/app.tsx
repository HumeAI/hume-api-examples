/// <reference lib="dom" />
import EVIChat from "./EVIChat";
import { WebsocketControls } from "./WebSocketControls";

function App() {
  return (
    <div>
      <WebsocketControls />
      <EVIChat />
    </div>
  );
}

// Initialize React app
const container = document.getElementById("app");
if (container) {
  const root = require("react-dom/client").createRoot(container);
  root.render(<App />);
}
