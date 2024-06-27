import { Hume } from "hume";

/**
 * fetches the weather at a given location in a specified temperature format
 * */ 
async function fetchWeather(location: string, format: string): Promise<string> {
  // fetch the location's geographic coordinates using Geocoding API
  const locationApiURL = `https://geocode.maps.co/search?q=${location}&api_key=${
    import.meta.env.VITE_GEOCODING_API_KEY}`;
  const locationResponse = await fetch(locationApiURL);
  const locationData = await locationResponse.json();

  // extract latitude and longitude from fetched location data
  const { lat, lon } = locationData[0];

  // fetch point metadata using the extracted location coordinates
  const pointMetadataEndpoint = `https://api.weather.gov/points/${parseFloat(
    lat
  ).toFixed(3)},${parseFloat(lon).toFixed(3)}`;
  const pointMetadataResponse = await fetch(pointMetadataEndpoint);
  const pointMetadata = await pointMetadataResponse.json();

  // extract weather forecast URL from point metadata
  const forecastUrl = pointMetadata.properties.forecast;

  // fetch the weather forecast using the forecast URL
  const forecastResponse = await fetch(forecastUrl);
  const forecastData = await forecastResponse.json();
  const forecast = JSON.stringify(forecastData.properties.periods);

  // return the temperature in the specified format
  return `${forecast} in ${format}`;
}

/**
 * handles ToolCall messages received from the WebSocket connection
 * */ 
export async function handleToolCallMessage(
  toolCallMessage: Hume.empathicVoice.ToolCallMessage,
  socket: Hume.empathicVoice.StreamSocket | null): Promise<void> {
  if (toolCallMessage.name === "get_current_weather") {
    try{
      // parse the parameters from the ToolCall message
      const args = JSON.parse(toolCallMessage.parameters) as {
        location: string;
        format: string;
      };

      // extract the individual arguments
      const { location, format } = args;

      // call weather fetching function with extracted arguments
      const weather = await fetchWeather(location, format);

      // send ToolResponse message to the WebSocket
      const toolResponseMessage = {
        type: "tool_response",
        toolCallId: toolCallMessage.toolCallId,
        content: weather,
      };

      socket?.sendToolResponseMessage(toolResponseMessage);
    } catch (error) {
      // send ToolError message to the WebSocket if there was an error fetching the weather
      const weatherToolErrorMessage = {
        type: "tool_error",
        toolCallId: toolCallMessage.toolCallId,
        error: "Weather tool error",
        content: "There was an error with the weather tool",
      };

      socket?.sendToolErrorMessage(weatherToolErrorMessage);
    }
  } else {
    // send ToolError message to the WebSocket if the requested tool was not found
    const toolNotFoundErrorMessage = {
      type: "tool_error",
      toolCallId: toolCallMessage.toolCallId,
      error: "Tool not found",
      content: "The tool you requested was not found",
    };

    socket?.sendToolErrorMessage(toolNotFoundErrorMessage);
  }
}
