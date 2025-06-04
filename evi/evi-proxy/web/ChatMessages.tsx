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
  
  const topEmotions = msg.models.prosody?.scores 
    ? Object.entries(msg.models.prosody.scores)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([emotion, score]) => `${emotion}: ${(score as number).toFixed(2)}`)
        .join(', ')
    : '';

  return (
    <div>
      <strong>{msg.message.role.charAt(0).toUpperCase() + msg.message.role.slice(1)}</strong>{': '}
      <span>{msg.message.content}</span>{' '}
      {topEmotions && <em>({topEmotions})</em>}
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
