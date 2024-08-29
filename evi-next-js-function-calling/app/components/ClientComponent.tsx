'use client';
import {
  VoiceProvider,
  ToolCallHandler
} from '@humeai/voice-react';
import Messages from './Controls';
import Controls from './Messages';

const handleToolCall: ToolCallHandler = async (
  message,
  send,
) => {
  if (message.name === 'get_current_weather') {
    try {
      const response = await fetch('/api/fetchWeather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parameters: message.parameters }),
      });

      const result = await response.json();

      if (result.success) {
        return send.success(result.data);
      } else {
        return send.error(result.error);
      }
    } catch (error) {
      return send.error({
        error: 'Weather tool error',
        code: 'weather_tool_error',
        level: 'warn',
        content: 'There was an error with the weather tool',
      });
    }
  }

  return send.error({
     error: 'Tool not found',
    code: 'tool_not_found',
    level: 'warn',
    content: 'The tool you requested was not found',
  });
};

export default function ClientComponent({ accessToken }: { accessToken: string }) {
  return (
    <VoiceProvider
      configId={process.env.NEXT_PUBLIC_HUME_CONFIG_ID}
      auth={{ type: 'accessToken', value: accessToken }}
      onToolCall={handleToolCall}
    >
      <Messages />
      <Controls />
    </VoiceProvider>
  );
}
