import "server-only";

/**
 * Function which consumes the geocode and weather APIs to get the current weather in a specified city
 *
 * @param parameters object which includes the city (location) and temperature format (fahrenheit' or 'celsius')
 * @returns the current temperature in the specified city in the specified format
 */
export const fetchWeather = async (parameters: string): Promise<string> => {
  const args = JSON.parse(parameters) as {
    location: string;
    format: "fahrenheit" | "celsius";
  };

  // fetch latitude and longitude coordinates of location
  const locationURL: string = `https://geocode.maps.co/search?q=${args.location}&api_key=${process.env.GEOCODING_API_KEY}`;
  const locationResponse = await fetch(locationURL, { method: "GET" });
  const locationJson = (await locationResponse.json()) as {
    lat: string;
    lon: string;
  }[];
  const { lat, lon } = locationJson[0];

  // fetch point metadata for location
  const pointMetadataURL: string = `https://api.weather.gov/points/${parseFloat(lat).toFixed(3)},${parseFloat(lon).toFixed(3)}`;
  const pointMetadataResponse = await fetch(pointMetadataURL, {
    method: "GET",
  });
  const pointMetadataJson = (await pointMetadataResponse.json()) as {
    properties: {
      gridId: string;
      gridX: number;
      gridY: number;
    };
  };
  const { gridId, gridX, gridY } = pointMetadataJson.properties;

  // fetch current weather
  const currentWeatherURL: string = `https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}/forecast`;
  const currentWeatherResponse = await fetch(currentWeatherURL, {
    method: "GET",
  });
  const currentWeatherJson = (await currentWeatherResponse.json()) as {
    properties: {
      periods: Array<{
        temperature: number;
        temperatureUnit: string;
      }>;
    };
  };

  // parse weather from current weather response and format (e.g., '70F')
  const { temperature } = currentWeatherJson.properties.periods[0];
  const unit = args.format === "fahrenheit" ? "F" : "C";
  const currentWeather = `${temperature}${unit}`;
  return currentWeather;
};
