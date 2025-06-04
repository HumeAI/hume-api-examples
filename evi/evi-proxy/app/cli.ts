import type { State, AppEvent } from '../shared/types.ts';
import { ERROR_CODES, CLOSE_TYPES, ERROR_CODE_KEYS } from '../shared/types.ts';
import * as p from "./clack_prompts.js";
import { exhaustive } from './util.ts';

const abortable = <T>(signal: AbortSignal, p: Promise<T>): Promise<T> => {
  const abort = new Promise<never>((_, reject) => {
    signal.addEventListener("abort", () => {
      reject(new DOMException("Operation was aborted", "AbortError"));
    });
  })
  return Promise.race([abort, p]);
}

export class CLI {
  private currentState: State | null = null;
  private abortController: AbortController | null = null;
  private PORT: number;
  private WS_PATH: string;
  private cliEventQueue: AppEvent[] = [];

  constructor(PORT: number, WS_PATH: string) {
    this.PORT = PORT;
    this.WS_PATH = WS_PATH;
  }

  setState(state: State): void {
    this.currentState = state;
    this.abortController?.abort();
  }

  getNextCLIEvent(): AppEvent | undefined {
    return this.cliEventQueue.shift();
  }

  private async menu(
    message: string,
    labels: string[],
    signal: AbortSignal,
    explicitKeys?: string[]
  ): Promise<string | symbol> {
    return await p.selectKey({
      message,
      options: labels.map((label, index) => {
        const key = explicitKeys ? explicitKeys[index] : label[0].toLowerCase();
        return {
          label,
          value: key,
          hint: key.toLowerCase(),
        };
      }),
      signal,
    });
  }

  private async playbackMenu(signal: AbortSignal, remainingMessages: number, isConnected: boolean): Promise<"n" | "q" | "e"> {
    const title = `Playback Mode (${remainingMessages} messages remaining)${isConnected ? " - Connected" : " - No client connected"}`;
    const options = isConnected ? ["Next", "Error simulation", "Quit"] : ["Quit"];
    const selected = await abortable(signal, this.menu(title, options, signal));

    if (selected === "q" || p.isCancel(selected)) {
      return "q";
    }
    if (selected === "e" && isConnected) {
      return "e";
    }
    if (selected !== "n") {
      return exhaustive(selected as never);
    }

    return selected;
  }

  private async errorSimulationMenu(signal: AbortSignal): Promise<"abnormal_disconnect" | "intentional_close" | "back" | keyof typeof ERROR_CODES> {
    const closeLabels = CLOSE_TYPES.map(type => 
      type === "abnormal_disconnect" ? "Abnormal disconnect (1006)" : "Intentional close (1000)"
    );
    const errorLabels = ERROR_CODE_KEYS.map(code => 
      `${ERROR_CODES[code].slug.replace(/_/g, ' ')} (${code})`
    );
    const allLabels = [...closeLabels, ...errorLabels, "Back"];
    const keys = allLabels.map((_, i) => (i + 1).toString());
    
    const selected = await abortable(signal, this.menu(
      "Select error to simulate:",
      allLabels,
      signal,
      keys
    ));

    if (p.isCancel(selected)) {
      return "back";
    }
    
    const index = parseInt(selected as string) - 1;
    if (index < CLOSE_TYPES.length) {
      return CLOSE_TYPES[index];
    }
    
    const errorIndex = index - CLOSE_TYPES.length;
    if (errorIndex < ERROR_CODE_KEYS.length) {
      return ERROR_CODE_KEYS[errorIndex];
    }
    
    return "back";
  }

  async getNextEvent(): Promise<AppEvent> {
    try {
      return await this.getNextEvent_();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { type: "noop" };
      }
      throw error;
    } finally {
      // Clean up the AbortController
      this.abortController = null;
    }
  }

  private async getNextEvent_(): Promise<AppEvent> {
    const state = this.currentState!;

    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    
    if (state.mode === "pending") {
      const selected = await abortable(signal, this.menu(
        `Proxy Ready ${state.status === 'connected' ? "(Client connected)" : "(No client connected)"}`,
        ["Record mode", "Playback mode", "Quit"],
        signal
      ));

      if (p.isCancel(selected) || selected === "q" || !selected) {
        return { type: "terminate" };
      }
      if (selected === "r") {
        return { type: "start_record_mode" };
      }
      if (selected === "p") {
        return { type: "start_loading_mode" };
      }
      throw new Error(`Unexpected selection: ${selected}`);
    }
    
    if (state.mode === "playback") {
      const remainingMessages = state.messages.length;
      const isConnected = state.status === "connected";
      const selected = await abortable(signal, this.playbackMenu(signal, remainingMessages, isConnected));
      if (selected === "n") {
        return { type: "send_next_message" };
      }
      if (selected === "q") {
        return { type: "exit_playback" };
      }
      if (selected === "e") {
        const errorType = await abortable(signal, this.errorSimulationMenu(signal));
        if (errorType === "back") {
          return { type: "noop" };
        }
        
        // Transport errors use simulate_close
        if (CLOSE_TYPES.includes(errorType as any)) {
          return { type: "simulate_close", closeType: errorType as typeof CLOSE_TYPES[number] };
        }
        
        // Inline errors use simulate_error with shouldClose from shared error codes
        const config = ERROR_CODES[errorType as keyof typeof ERROR_CODES];
        return { 
          type: "simulate_error", 
          errorCode: errorType,
          shouldClose: config?.shouldClose ?? false
        };
      }
      return exhaustive(selected);
    }
    
    if (state.mode === "record") {
      const isWaitingForConnection = state.status === "disconnected";

      let message = `Recording Mode (${state.messages.length} messages captured)`;
      if (isWaitingForConnection) {
        message = `Recording Mode - Waiting for client to connect to ws://localhost:${this.PORT}${this.WS_PATH}`;
      } else {
        message = `Recording Mode - Connected (${state.messages.length} messages captured)`;
      }

      const selected = await abortable(signal, this.menu(message, ["Quit"], signal));

      if (selected === "q" || p.isCancel(selected)) {
        return { type: "save_and_exit_record" };
      }
      return exhaustive(selected as never);
    }

    if (state.mode === "saving") {
      const selected = await abortable(signal, this.menu(
        `Save recording with ${state.messages.length} messages?`,
        ["Save", "Discard"],
        signal
      ));

      if (p.isCancel(selected) || selected === "d") {
        return { type: "discard_recording" };
      }
      if (selected === "s") {
        const pathResult = await abortable(signal, p.text({
          message: "Enter the path to save the recording",
          initialValue: "recording.jsonl",
          signal,
        }));
        
        if (p.isCancel(pathResult)) {
          return { type: "discard_recording" };
        }
        
        return { 
          type: "provide_save_path", 
          filePath: pathResult as string 
        };
      }
      return exhaustive(selected as never);
    }

    if (state.mode === "loading") {
      const selected = await abortable(signal, this.menu(
        "Load recording for playback",
        ["Load", "Cancel"],
        signal
      ));

      if (p.isCancel(selected) || selected === "c") {
        return { type: "cancel_loading" };
      }
      if (selected === "l") {
        const pathResult = await abortable(signal, p.text({
          message: "Enter the path to load an EVI recording",
          initialValue: "recording.jsonl",
          signal,
        }));
        
        if (p.isCancel(pathResult)) {
          return { type: "cancel_loading" };
        }
        
        return { 
          type: "provide_load_path", 
          filePath: pathResult as string 
        };
      }
      return exhaustive(selected as never);
    }
    
    return { type: 'noop' };
  }

  async maybePromptUserIfNeeded() {
    if (this.cliEventQueue.length === 0) {
      const event = await this.getNextEvent();
      this.cliEventQueue.push(event);
    }
  }

  async runPromptLoop() {
    while (true) {
      const event = await this.getNextEvent();
      this.cliEventQueue.push(event);
    }
  }
}
