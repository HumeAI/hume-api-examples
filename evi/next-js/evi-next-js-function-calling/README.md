<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface | Next.js Function Calling Example</h1>
</div>

## Overview

This project features a sample implementation of Hume's [Empathic Voice Interface](https://dev.hume.ai/docs/empathic-voice-interface-evi/overview) using Hume's [React SDK](https://github.com/HumeAI/empathic-voice-api-js/tree/main/packages/react). Here, we have a simple EVI that calls a function to get the weather for a given location.

See the [Tool Use guide](https://dev.hume.ai/docs/empathic-voice-interface-evi/features/tool-use) for a detailed explanation of the code in this project.

## EVI setup

1. [Create a tool](https://dev.hume.ai/docs/empathic-voice-interface-evi/tool-use#create-a-tool) with the following payload:

```json
{
  "name": "get_current_weather",
  "description": "This tool is for getting the current weather.",
  "parameters": "{ \"type\": \"object\", \"properties\": { \"location\": { \"type\": \"string\", \"description\": \"The city and state, e.g. San Francisco, CA\" }, \"format\": { \"type\": \"string\", \"enum\": [\"celsius\", \"fahrenheit\"], \"description\": \"The temperature unit to use. Infer this from the users location.\" } }, \"required\": [\"location\", \"format\"] }"
}
```

2. [Create a configuration](https://dev.hume.ai/docs/empathic-voice-interface-evi/tool-use#create-a-configuration) equipped with that tool:

```json
{
  "name": "Weather Assistant Config",
  "language_model": {
    "model_provider": "ANTHROPIC",
    "model_resource": "claude-3-5-sonnet-20240620",
  },
  "tools": [
    {
      "id": "<YOUR_TOOL_ID>",
      "version": 0
    }
  ]
}
```

## Instructions

1. Clone this examples repository:

    ```shell
    git clone https://github.com/humeai/hume-api-examples
    cd hume-api-examples/evi/next-js/evi-next-js-function-calling
    ```

2. Install dependencies:
    ```shell
    pnpm install
    ```

3. Set up your API keys:

  * Visit the [API keys page](https://platform.hume.ai/settings/keys) on the Hume Platform to retrieve your API key. See our documentation on [getting your api keys](https://dev.hume.ai/docs/introduction/api-key).
  * Place your `HUME_API_KEY` and `HUME_SECRET_KEY` in a `.env` file at the project root. You can copy the `.env.example` file to use as a template:

    ```shell
    cp .env.example .env
    ```

4. Add your Configuration ID to the `.env` file. This corresponds to the EVI configuration you created earlier that includes your weather tool.

5. Add the Geocoding API key to the `.env` file. You can obtain it for free from [geocode.maps.co](https://geocode.maps.co/).

6. Run the project:
    ```shell
    pnpm run dev
    ```

This will start the Next.js development server, and you can access the application at `http://localhost:3000`.

## License

This project is licensed under the MIT License - see the [LICENSE.md](https://github.com/HumeAI/hume-api-examples/blob/main/LICENSE) file for details.
