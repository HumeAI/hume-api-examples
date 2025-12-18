export type Message = {
  type: string;
}

export type WSMessage = Parameters<WebSocket["send"]>[0];

export type State = {
  status: "disconnected" | "connected";
  mode: "pending" | "playback" | "record" | "saving" | "loading"
  messages: Message[];
  errors: Array<[number, string]>; // [timestamp, message]
}

export type AppEvent =
  | {
      type: "start_record_mode";
    }
  | {
      type: "start_loading_mode";
    }
  | {
      type: "start_playback_mode";
      messages: Message[];
    }
  | {
      type:
        | "terminate"
        | "send_next_message"
        | "exit_playback"
        | "save_and_exit_record"
        | "discard_recording"
        | "cancel_loading"
        | "noop";
    }
  | {
      type: "confirm_save";
      shouldSave: boolean;
    }
  | {
      type: "provide_save_path" | "provide_load_path";
      filePath: string;
    }
  | {
      type: "connection_change";
      status: "connected" | "disconnected";
    }
  | {
      type: "simulate_close";
      closeType: "abnormal_disconnect" | "intentional_close";
    }
  | {
      type: "simulate_error";
      errorCode: string;
      shouldClose: boolean;
    }
  | {
      type: "report_error";
      message: string;
    };

export const ERROR_CODES = {
  "I0116": {
    slug: "transcription_failure",
    message: "Unable to transcribe audio. Please ensure that your audio is appropriately encoded.",
    shouldClose: true,
    closeCode: 1000
  },
  "E0714": {
    slug: "inactivity_timeout", 
    message: "Chat was ended because no user message was received in 20 seconds.",
    shouldClose: true,
    closeCode: 1000
  },
  "E0715": {
    slug: "max_duration_timeout",
    message: "Chat was ended because it exceeded the max duration of 120 seconds.", 
    shouldClose: true,
    closeCode: 1000
  },
  "E0712": {
    slug: "custom_language_model_timed_out",
    message: "Custom language model http://example.com:3000 timed out during connection attempt.",
    shouldClose: false,
    closeCode: null
  }
} as const;

export const CLOSE_TYPES = ["abnormal_disconnect", "intentional_close"] as const;
export const ERROR_CODE_KEYS = Object.keys(ERROR_CODES) as Array<keyof typeof ERROR_CODES>;

export type Effect =
  | {
      type: "send_message_downstream";
      message: Message & {type: string};
      index: number;
    }
  | {
      type: "save_recording";
      messages: Message[];
      filePath: string;
    }
  | {
      type: "load_recording";
      filePath: string;
    }
  | {
      type: "connect_upstream" | "cleanup" | "terminate";
    }
  | {
      type: "simulate_close";
      closeType: "abnormal_disconnect" | "intentional_close";
    }
  | {
      type: "simulate_error";
      errorCode: string;
      shouldClose: boolean;
    };
