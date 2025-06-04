import 'dotenv/config';
import * as fs from "fs";
import * as p from "@clack/prompts";
import * as http from "http";
import * as path from "path";
import { fileURLToPath } from "url";
import { CLI } from "./cli.js";
import type { Message, State, AppEvent, Effect } from '../shared/types.ts';
import * as sharedTypes  from '../shared/types.ts';
const { ERROR_CODES } = sharedTypes;
import { Api } from "./api.js";
import { BaseUpstream, LiveUpstream, PlaybackUpstream, UninitializedUpstream } from "./upstream.js";
import { Downstream } from "./downstream.js";
import { exhaustive, truncateDataReplacer } from "./util.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "../out");

const PORT = 3000;
const DOWNSTREAM_WS_PATH = "/v0/evi/chat";
const UPSTREAM_WS_BASE_URL = "wss://api.hume.ai";


let currentState: State = {
  mode: "pending",
  status: "disconnected",
  messages: [],
};

const api = new Api();

// We serve
//  a) The frontend
//  b) API endpoints so the frontend can control the proxy.
//
//  The websocket proxy is attached to `/v0/evi/chat` later by Downstream.connect(...)
const serve = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  const url = new URL(`http://localhost:${PORT}` + req.url!);

  // API endpoints
  if (url.pathname === "/api") {
    const handled = api.handleRequest(req, res, currentState);
    if (handled) {
      return;
    }
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    const htmlPath = path.join(DIST_DIR, "index.html");
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Cache-Control": "no-cache",
      });
      res.write(fs.readFileSync(htmlPath));
      res.end();
      return;
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.write("out/index.html not found. Run (cd web && npm run build) to build the frontend.");
      res.end();
      return;
    }
  }
  const filePath = path.join(DIST_DIR, url.pathname);
  if (fs.existsSync(filePath)) {
    let contentType = "application/octet-stream";
    if (filePath.endsWith(".js")) contentType = "application/javascript";
    else if (filePath.endsWith(".css")) contentType = "text/css";
    else if (filePath.endsWith(".html")) contentType = "text/html";
    res.writeHead(200, { "Content-Type": contentType });
    res.write(fs.readFileSync(filePath));
    res.end();
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.write("File not found");
  res.end();
};

const loadRecording = async (filePath: string): Promise<Message[]> => {
  const messages: Message[] = [];

  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      process.exit(1);
    }

    const fileContent = fs.readFileSync(filePath, "utf8");
    const lines = fileContent.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      try {
        const message = JSON.parse(line);
        messages.push(message);
      } catch (error) {
        console.log(`Error parsing line in script file: ${line}`);
      }
    }

    return messages;
  } catch (error) {
    console.log(`Error reading script file: ${error}`);
    process.exit(1);
  }
};

const sendMessageEffect = (message: Message, index: number): Effect => ({
  type: "send_message_downstream",
  message,
  index,
});

const connectUpstreamEffect = (): Effect => ({
  type: "connect_upstream",
});

const cleanupEffect = (): Effect => ({
  type: "cleanup",
});

const saveRecordingEffect = (messages: Message[], filePath: string): Effect => ({
  type: "save_recording",
  messages,
  filePath,
});

const next = (state: State, event: AppEvent): [State, Effect[]] => {
  const result = (state: State, ...effects: Effect[]) =>
    [state, effects] as [State, Effect[]];
  switch (event.type) {
    case "start_record_mode": {
      if (state.status !== "disconnected") return result(state);
      return result({ ...state, mode: "record", messages: [] });
    }
    case "start_loading_mode": {
      if (state.status !== "disconnected") return result(state);
      return result({ ...state, mode: "loading" });
    }
    case "start_playback_mode": {
      if (state.status !== "disconnected") return result(state);
      return result({ ...state, mode: "playback", messages: event.messages });
    }
    case "terminate":
      return result({ ...state, mode: "pending" }, { type: "terminate" });
    case "send_next_message": {
      if (state.mode !== "playback") return result(state);
      // No more messages to send
      if (state.messages.length === 0) return result(state);
      const [nextMessage, ...rest] = state.messages;
      return result({ ...state, messages: rest }, sendMessageEffect(nextMessage, 0));
    }
    case "exit_playback":
      return result({ ...state, mode: "pending" }, cleanupEffect());
    case "save_and_exit_record": {
      if (state.mode !== "record") return result(state);
      if (state.messages.length === 0) {
        return result({ ...state, mode: "pending" }, cleanupEffect());
      }
      return result({ ...state, mode: "saving" }, cleanupEffect());
    }
    case "confirm_save":
      // Not used in new state
      return result(state);
    case "provide_save_path": {
      if (state.mode !== "saving") return result(state);
      return result({ ...state, mode: "pending", messages: [] }, saveRecordingEffect(state.messages, event.filePath));
    }
    case "discard_recording":
      if (state.mode !== "saving") return result(state);
      return result({ ...state, mode: "pending", messages: [] });
    case "cancel_loading":
      if (state.mode !== "loading") return result(state);
      return result({ ...state, mode: "pending" });
    case "provide_load_path": {
      if (state.mode !== "loading" && state.mode !== 'pending') return result(state);
      return result({...state, mode: 'loading'}, { type: "load_recording", filePath: event.filePath });
    }
    case "simulate_close": {
      if (state.mode !== "playback") return result(state);
      return result(state, { type: "simulate_close", closeType: event.closeType });
    }
    case "simulate_error": {
      if (state.mode !== "playback") return result(state);
      return result(state, { type: "simulate_error", errorCode: event.errorCode, shouldClose: event.shouldClose });
    }
    case "connection_change":
      if (event.status === "disconnected") {
        // If we're recording and have messages, auto-transition to saving mode
        if (state.mode === "record" && state.messages.length > 0) {
          return result({ ...state, mode: "saving", status: "disconnected" }, cleanupEffect());
        }
        return result({ ...state, status: "disconnected" }, cleanupEffect());
      }
      return result({ ...state, status: "connected" }, connectUpstreamEffect());
    case "noop":
      return result(state);
    default:
      return exhaustive(event);
  }
};

async function* eventStream(api: Api, cli: CLI, eventQueue: AppEvent[]) {
  while (true) {
    // Priority: API > eventQueue > CLI
    if (api.hasAPIEvents()) {
      yield api.getNextAPIEvent()!;
      continue;
    }
    if (eventQueue.length > 0) {
      const evt = eventQueue.shift();
      if (evt) yield evt;
      continue;
    }
    const cliEvt = cli.getNextCLIEvent();
    if (cliEvt) {
      yield cliEvt;
      continue;
    }
    // Nothing to yield, just wait a bit
    await new Promise(r => setTimeout(r, 50));
  }
}

function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

async function main() {
  let upstream: BaseUpstream = new UninitializedUpstream();
  const eventQueue: AppEvent[] = [];
  const server = http.createServer(serve);
  server.listen(PORT);
  await new Promise<void>((resolve) => {
    server.on("listening", () => {
      p.log.success(
        `Serving example app at http://localhost:${PORT}, websocket server available at ws://localhost:${PORT}${DOWNSTREAM_WS_PATH}`,
      );
      resolve();
    });
  });

  const downstream = Downstream.connect({
    server,
    path: DOWNSTREAM_WS_PATH,
    maybeRejectConnectionWithMessage: () => {
      if (currentState.mode !== "record" && currentState.mode !== "playback") {
        return "Enter record mode or playback mode to accept new connections";
      }
    },
  });

  downstream.on("connect", () => {
    eventQueue.push({
      type: "connection_change",
      status: "connected",
    });
  });

  downstream.on("disconnect", () => {
    eventQueue.push({
      type: "connection_change",
      status: "disconnected",
    });
  })

  downstream.on("message", (message, isBinary) => {
    if (currentState.mode === "record") {
      // @humeai/voice-react sends audio messages as binary data but passing them upstream seems to fail.
      // base64 encoding the binary messages explicitly seems like
      // a workaround.
      if (isBinary) {
        upstream.send(JSON.stringify({ type: 'audio_input', data: message.toString('base64') }));
      } else {
        upstream.send(message)
      }
    }
  });

  const cli = new CLI(PORT, DOWNSTREAM_WS_PATH);
  cli.setState(currentState);
  cli.runPromptLoop();

  for await (const event of eventStream(api, cli, eventQueue)) {
    const [newState, effects] = next(currentState, event);
    if (!shallowEqual(newState, currentState)) {
      currentState = newState;
      api.broadcastState(currentState);
      cli.setState(currentState);
    }

    for (const effect of effects) {
      switch (effect.type) {
        case "send_message_downstream":
          p.log.info(
            `Sending message #${effect.index + 1}: ${effect.message.type}`,
          );
          downstream.broadcast(effect.message);
          break;
        case "connect_upstream":
          if (currentState.mode === "record") {
            upstream = new LiveUpstream();
            upstream.connect({
              baseUrl: UPSTREAM_WS_BASE_URL,
              apiKey: process.env.HUME_API_KEY!,
              configId: process.env.HUME_CONFIG_ID,
              resumedChatGroupId: process.env.HUME_CHAT_GROUP_ID,
            });
            upstream.onMessage((message) => {
              p.log.info(
                `Received message from Hume: ${JSON.stringify(message, truncateDataReplacer)}`,
              );
              downstream.broadcast(message);
              if (currentState.mode === "record") {
                currentState.messages.push(message);
              }
            });
          } else if (currentState.mode === "playback") {
            upstream = new PlaybackUpstream();
            (upstream as PlaybackUpstream).setPlaybackMessages(currentState.messages);
            upstream.connect();
            upstream.onMessage((message) => {
              p.log.info(
                `Playback: Emitting message: ${JSON.stringify(message, truncateDataReplacer)}`,
              );
              downstream.broadcast(message);
            });
          }
          break;
        case "cleanup":
          if (currentState.mode === "record" || currentState.mode === "playback") {
            upstream.close();
          }
          downstream.close();
          upstream = new UninitializedUpstream();
          break;
        case "load_recording":
          try {
            const messages = await loadRecording(effect.filePath);
            // Trigger transition to playback mode
            eventQueue.push({
              type: "start_playback_mode",
              messages: messages,
            });
          } catch (error) {
            p.log.error(`Failed to load recording: ${error}`);
            // Return to pending mode on error
            eventQueue.push({
              type: "cancel_loading",
            });
          }
          break;
        case "save_recording":
          const jsonlData = effect.messages
            .map((msg) => JSON.stringify(msg))
            .join("\n");
          fs.writeFileSync(effect.filePath, jsonlData);
          p.log.success(`Recording saved to ${effect.filePath}`);
          break;
        case "simulate_close":
          if (effect.closeType === "abnormal_disconnect") {
            downstream.closeWithError(1006, "");
          } else if (effect.closeType === "intentional_close") {
            downstream.closeWithError(1000, "");
          }
          break;
        case "simulate_error":
          const errorConfig = ERROR_CODES[effect.errorCode as keyof typeof ERROR_CODES];
          if (errorConfig) {
            downstream.sendError({
              type: 'error',
              code: effect.errorCode,
              slug: errorConfig.slug,
              message: errorConfig.message,
              custom_session_id: null,
              request_id: "48a3d067-67de-4520-b11b-7dade319b76f762379",
            });
            if (effect.shouldClose && errorConfig.shouldClose && errorConfig.closeCode) {
              downstream.closeWithError(errorConfig.closeCode, "");
            }
          }
          break;
        case "terminate":
          downstream.close();
          if (!(upstream instanceof UninitializedUpstream)) {
            upstream.close();
          }
          p.log.info("Goodbye!");
          process.exit(0);
        default:
          exhaustive(effect);
      }
    }
  }
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
