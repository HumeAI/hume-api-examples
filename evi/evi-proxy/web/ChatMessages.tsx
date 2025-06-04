import React, { forwardRef } from "react";
import { useVoice } from "@humeai/voice-react";
import type { EmotionScores } from "hume/api/resources/empathicVoice";

const Card = (props: {
  msg: {
    message: { role: string; content?: string };
    models: { prosody?: { scores?: EmotionScores } };
  };
}) => {
  const { msg } = props;
  return (
    <div>
      <div>
        {msg.message.role.charAt(0).toUpperCase() + msg.message.role.slice(1)}
      </div>
      <div>{msg.message.content}</div>
      <div>
        {msg.models.prosody?.scores && (
          <div>
            {Object.entries(msg.models.prosody.scores)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 3)
              .map(([emotion, score]) => (
                <span>
                  {emotion}: <span>{(score as number).toFixed(2)}</span>
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ChatMessages = forwardRef<HTMLDivElement>((_, ref) => {
  const { messages } = useVoice();
  return (
    <div ref={ref}>
      <div>
        {messages.map((msg) => {
          if (msg.type === "user_message" || msg.type === "assistant_message") {
            return <Card msg={msg} />;
          }
        })}
      </div>
    </div>
  );
});

export default ChatMessages;
