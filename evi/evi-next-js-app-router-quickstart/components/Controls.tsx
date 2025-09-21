"use client";

import { useVoice } from "@humeai/voice-react";
import { Button } from "./ui/button";
import { Mic, MicOff, Phone } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Toggle } from "./ui/toggle";
import { cn } from "@/utils";

export default function Controls({
  onEndCall, // new prop
}: {
  onEndCall?: () => void;
}) {
  const { disconnect, status, isMuted, unmute, mute } = useVoice();

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
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            className="p-4 bg-card border border-border rounded-lg shadow-sm flex items-center gap-4"
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
              {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </Toggle>

            <Button
              className="flex items-center gap-1"
              onClick={async () => {
                await disconnect();
                if (onEndCall) onEndCall(); // stop the timer
              }}
              variant="destructive"
            >
              <span>
                <Phone className="size-4 opacity-50" strokeWidth={2} stroke="currentColor" />
              </span>
              <span>End Call</span>
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
