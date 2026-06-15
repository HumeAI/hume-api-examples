import { ConnectOptions, useVoice } from "@humeai/voice-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./ui/button";
import { Phone } from "lucide-react";
import type { Hume } from "hume";

type StartCallProps = (
  | { accessToken: string; apiKey?: never }
  | { apiKey: string; accessToken?: never }
) & {
  sessionSettings?: Hume.empathicVoice.SessionSettings;
};

export default function StartCall({
  accessToken,
  apiKey,
  sessionSettings,
}: StartCallProps) {
  const { status, connect } = useVoice();

  const EVI_CONNECT_OPTIONS: ConnectOptions = {
    auth: {
      type: "apiKey",
      value: "6KSM0nVfyufqwvqnqQICfvcExiCNC68TV6Eb8qA6iyT6xFRt",
    },
    ...(sessionSettings != null && { sessionSettings }),
    // configId: "ebddd014-0252-4bcb-91cd-6ea0936e2435", //default
    // configId: "778016e5-ca19-4536-b1a2-854d4d3ec4e8", //patient
    configId: "04c67787-6652-4653-a10f-b456412f98d9", //responsive
    hostname: "https://test-api.hume.ai",
  };

  return (
    <AnimatePresence>
      {status.value !== "connected" ? (
        <motion.div
          className={
            "fixed inset-0 p-4 flex items-center justify-center bg-background"
          }
          initial="initial"
          animate="enter"
          exit="exit"
          variants={{
            initial: { opacity: 0 },
            enter: { opacity: 1 },
            exit: { opacity: 0 },
          }}
        >
          <AnimatePresence>
            <motion.div
              variants={{
                initial: { scale: 0.5 },
                enter: { scale: 1 },
                exit: { scale: 0.5 },
              }}
            >
              <Button
                className={"z-50 flex items-center gap-1.5"}
                onClick={() => {
                  connect(EVI_CONNECT_OPTIONS)
                    .then(() => {})
                    .catch(() => {})
                    .finally(() => {});
                }}
              >
                <span>
                  <Phone
                    className={"size-4 opacity-50"}
                    strokeWidth={2}
                    stroke={"currentColor"}
                  />
                </span>
                <span>Start Call</span>
              </Button>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
