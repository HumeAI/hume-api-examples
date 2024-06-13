# EVI Next.js Function Calling Example

## Introduction

This project is an example of how to call functions in a Next.js application using EVI. Here, we have a simple EVI that calls a function to get the current weather for a given location.

## EVI setup

1. Create a .env file and add your [API Key and your Secret Key](https://beta.hume.ai/settings/keys):

```bash
echo "NEXT_PUBLIC_HUME_API_KEY = <YOUR_HUME_API_KEY>" >> .env
echo "NEXT_PUBLIC_HUME_SECRET_KEY = <YOUR_HUME_SECRET_KEY>" >> .env
```

2. [Create a tool](https://dev.hume.ai/docs/empathic-voice-interface-evi/tool-use#create-a-tool) with the following payload:

```json
{
  "name": "get_current_weather",
  "description": "This tool is for getting the current weather.",
  "parameters": "{ \"type\": \"object\", \"properties\": { \"location\": { \"type\": \"string\", \"description\": \"The city and state, e.g. San Francisco, CA\" }, \"format\": { \"type\": \"string\", \"enum\": [\"celsius\", \"fahrenheit\"], \"description\": \"The temperature unit to use. Infer this from the users location.\" } }, \"required\": [\"location\", \"format\"] }"
}
```

3. [Create a config](https://dev.hume.ai/docs/empathic-voice-interface-evi/tool-use#create-a-configuration) equipped with that tool:

```json
{
  "name": "Weather Assistant Config",
  "language_model": {
    "model_provider": "OPEN_AI",
    "model_resource": "gpt-3.5-turbo"
  },
  "tools": [
    {
      "id": "<YOUR_TOOL_ID>",
      "version": 0
    }
  ]
}
```

3. Add the Config ID to your environment variables.

```bash
echo "NEXT_PUBLIC_HUME_CONFIG_ID = <YOUR_HUME_CONFIG_ID>" >> .env
```

4. Add the Geocoding API key to your environment variables (free to use from [geocode.maps.co](https://geocode.maps.co/)).

```bash
echo "NEXT_PUBLIC_GEOCODING_API_KEY = <YOUR_GEOCODING_API_KEY>" >> .env
```

## Installation

To install the project, follow these steps:

1. Clone the repository: `git clone https://github.com/yourusername/evi-next-js-function-calling.git`
2. Navigate into the project directory: `cd evi-next-js-function-calling`
3. Install the dependencies: `pnpm install`
4. Add your environment variables, including your Config ID and Geocoding API key.

## Usage

To run the project, use the command: `pnpm run dev`

This will start the Next.js development server, and you can access the application at `http://localhost:3000`.

## License

This project is licensed under the MIT License - see the [LICENSE.md](https://github.com/HumeAI/hume-api-examples/blob/main/LICENSE) file for details.
