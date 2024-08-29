'use client';
import { Hume } from 'hume';
import {
  VoiceProvider,
  ToolCallHandler,
  ToolResponse,
  ToolError,
} from '@humeai/voice-react';
import Messages from './Controls';
import Controls from './Messages';

const handleToolCall: ToolCallHandler = async (
  message: Hume.empathicVoice.ToolCallMessage,
): Promise<ToolResponse | ToolError> => {
  console.log('Tool call received: ', message);

  if (message.name === 'get_current_weather') {
    try {
      const response = await fetch('/api/fetchWeather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parameters: message.parameters }),
      });

      const result = await response.json();

      if (result.success) {
        return {
          type: 'tool_response',
          toolCallId: message.toolCallId,
          content: result.data,
          receivedAt: new Date(),
        } as ToolResponse;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error: there was an error with the weather tool.');
      return {
        type: 'tool_error',
        toolCallId: message.toolCallId,
        error: 'Weather tool error',
        code: 'weather_tool_error',
        level: 'warn',
        content: 'There was an error with the weather tool',
        receivedAt: new Date(),
      } as ToolError;
    }
  }

  console.error(`Error: the ${message.name} tool could not be found.`);
  return {
    type: 'tool_error',
    toolCallId: message.toolCallId,
    error: 'Tool not found',
    code: 'tool_not_found',
    level: 'warn',
    content: 'The tool you requested was not found',
    receivedAt: new Date(),
  } as ToolError;
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
