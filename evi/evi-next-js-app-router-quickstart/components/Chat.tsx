"use client";

import { VoiceProvider } from "@humeai/voice-react";
import Messages from "./Messages";
import Controls from "./Controls";
import StartCall from "./StartCall";
import { ComponentRef, useRef, useState, useEffect } from "react";

export default function ClientComponent({
  accessToken,
}: {
  accessToken: string;
}) {
  const timeout = useRef<number | null>(null);
  const ref = useRef<ComponentRef<typeof Messages> | null>(null);

  const [callStarted, setCallStarted] = useState(false);
  const [timer, setTimer] = useState(0);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timer;
    if (callStarted) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval as unknown as number);
  }, [callStarted]);

  return (
    <div className="relative grow flex flex-col mx-auto w-full overflow-hidden">
      {/* Timer display at the top */}
      {callStarted && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-card text-black px-4 py-2">
          {Math.floor(timer / 60)
            .toString()
            .padStart(2, "0")}
          :
          {(timer % 60).toString().padStart(2, "0")}
        </div>
      )}

      <VoiceProvider
        onMessage={() => {
          if (timeout.current) {
            window.clearTimeout(timeout.current);
          }

          timeout.current = window.setTimeout(() => {
            if (ref.current) {
              const scrollHeight = ref.current.scrollHeight;

              ref.current.scrollTo({
                top: scrollHeight,
                behavior: "smooth",
              });
            }
          }, 200);
        }}
      >
        {/*<Messages ref={ref} />*/}
        <Controls onEndCall={() => {
          setCallStarted(false); // stop the timer
          setTimer(0);           // reset timer to zero
        }}/>
        <StartCall
          accessToken={accessToken}
          onStartCall={() => setCallStarted(true)} // pass callback
        />
      </VoiceProvider>
    </div>
  );
}
