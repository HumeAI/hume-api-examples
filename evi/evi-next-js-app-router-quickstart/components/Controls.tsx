"use client";
import { useVoice } from "@humeai/voice-react";
import { Button } from "./ui/button";
import { Mic, MicOff, Phone } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Toggle } from "./ui/toggle";
import MicFFT from "./MicFFT";
import { cn } from "@/utils";
import { useEffect } from "react";
import { trackVoiceStatus } from "@/utils/e2e-hooks";

const E2E_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_E2E_HOOKS &&
  process.env.NEXT_PUBLIC_ENABLE_E2E_HOOKS !== "false";

export default function Controls() {
  const { disconnect, status, isMuted, unmute, mute, micFft, sendSessionSettings } =
    useVoice();

  useEffect(() => {
    trackVoiceStatus(status.value);
  }, [status.value]);

  useEffect(() => {
    if (E2E_ENABLED && typeof window !== "undefined") {
      (window as Window & { __sendSessionSettings?: typeof sendSessionSettings }).__sendSessionSettings = sendSessionSettings;
      return () => {
        delete (window as Window & { __sendSessionSettings?: unknown }).__sendSessionSettings;
      };
    }
  }, [sendSessionSettings]);

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 w-full p-4 flex items-center justify-center",
        "bg-gradient-to-t from-card via-card/90 to-card/0",
      )}
    >
      <AnimatePresence>
        {status.value === "connected" ? (
          <motion.div
            initial={{
              y: "100%",
              opacity: 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{
              y: "100%",
              opacity: 0,
            }}
            className={
              "p-4 bg-card border border-border rounded-lg shadow-sm flex items-center gap-4"
            }
          >
            <Toggle
              pressed={!isMuted}
              onPressedChange={() => {
                if (isMuted) {
                  unmute();
                } else {
                  mute();
                }
              }}
            >
              {isMuted ? (
                <MicOff className={"size-4"} />
              ) : (
                <Mic className={"size-4"} />
              )}
            </Toggle>

            <div className={"relative grid h-8 w-48 shrink grow-0"}>
              <MicFFT fft={micFft} className={"fill-current"} />
            </div>

            <Button
              className={"flex items-center gap-1"}
              onClick={async () => await disconnect()}
              variant={"destructive"}
            >
              <span>
                <Phone
                  className={"size-4 opacity-50"}
                  strokeWidth={2}
                  stroke={"currentColor"}
                />
              </span>
              <span>End Call</span>
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
