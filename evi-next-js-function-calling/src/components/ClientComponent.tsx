"use client";
import { 
  VoiceProvider, 
  ToolCall, 
  ToolCallHandler,
  ToolResponse, 
  ToolError, 
} from "@humeai/voice-react";
import Messages from "./Controls";
import Controls from "./Messages";

const handleToolCall: ToolCallHandler = async (
  toolCall: ToolCall
): Promise<ToolResponse | ToolError> => {
  console.log("Tool call received", toolCall);

  if (toolCall.name === 'weather_tool') {
    try {
      const args = JSON.parse(toolCall.parameters) as {
        location: string;
        format: 'fahrenheit' | 'celsius';
      };

      const location = await fetch(
        `https://geocode.maps.co/search?q=${args.location}&api_key=${process.env.NEXT_PUBLIC_GEOCODING_API_KEY}`,
      );

      const locationResults = (await location.json()) as {
        lat: string;
        lon: string;
      }[];

      const { lat, lon } = locationResults[0];

      const pointMetadataEndpoint: string = `https://api.weather.gov/points/${parseFloat(lat).toFixed(3)},${parseFloat(lon).toFixed(3)}`;

      const result = await fetch(pointMetadataEndpoint, {
        method: 'GET',
      });

      const json = (await result.json()) as {
        properties: {
          forecast: string;
        };
      };
      const { properties } = json;
      const { forecast: forecastUrl } = properties;

      const forecastResult = await fetch(forecastUrl);

      const forecastJson = (await forecastResult.json()) as {
        properties: {
          periods: unknown[];
        };
      };
      const forecast = forecastJson.properties.periods;

      return {
        type: 'tool_response',
        tool_call_id: toolCall.tool_call_id,
        content: JSON.stringify(forecast),
      };
    } catch (error) {
      return {
        type: 'tool_error',
        tool_call_id: toolCall.tool_call_id,
        error: 'Weather tool error',
        code: 'weather_tool_error',
        level: 'warn',
        content: 'There was an error with the weather tool',
      };
    }
  } else {
    return {
      type: 'tool_error',
      tool_call_id: toolCall.tool_call_id,
      error: 'Tool not found',
      code: 'tool_not_found',
      level: 'warn',
      content: 'The tool you requested was not found',
    };
  }
};

export default function ClientComponent({
  accessToken,
}: {
  accessToken: string;
}) {
  return (
    <VoiceProvider
      configId={process.env.NEXT_PUBLIC_HUME_CONFIG_ID}
      auth={{ type: "accessToken", value: accessToken }}
      onToolCall={handleToolCall}
      onMessage={(message: unknown) => console.log(message)}
    >
      <Messages />
      <Controls />
    </VoiceProvider>
  );
}
