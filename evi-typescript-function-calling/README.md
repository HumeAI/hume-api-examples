<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>EVI TypeScript Function Calling Example</h1>
</div>

## Overview

This project showcases how to call functions in a sample implementation of Hume's [Empathic Voice Interface](https://hume.docs.buildwithfern.com/docs/empathic-voice-interface-evi/overview) using Hume's Typescript SDK. Here, we have a simple EVI that calls a function to get the current weather for a given location.

## Prerequisites

To run this project locally, ensure your development environment meets the following requirements:

- [Node.js](https://nodejs.org/en) (`v18.0.0` or higher)
- [pnpm](https://pnpm.io/installation) (`v8.0.0` or higher)

To check the versions of `pnpm` and `Node.js` installed on a Mac via the terminal, you can use the following commands:

1. **For Node.js**, enter the following command and press Enter:

```bash
node -v
```

This command will display the version of Node.js currently installed on your system, for example, `v21.6.1`.

2. **For pnpm**, type the following command and press Enter:

```bash
pnpm -v
```

This command will show the version of `pnpm` that is installed, like `8.10.0`.

If you haven't installed these tools yet, running these commands will result in a message indicating that the command was not found. In that case, you would need to install them first. Node.js can be installed from its official website or via a package manager like Homebrew, and `pnpm` can be installed via npm (which comes with Node.js) by running `npm install -g pnpm` in the terminal.

## EVI setup
Before running this project, you'll need to set up EVI with the ability to leverage tools or call functions. Follow the steps below for authentication, as well as creating a Tool and adding it to a configuration.

1. Create a `.env` file in the root folder of the repo and add your [API Key and Secret Key](https://dev.hume.ai/docs/introduction/api-key).

> There is an example file called [`.env.example`](https://github.com/HumeAI/hume-api-examples/blob/main/evi-typescript-function-calling/.env.example) with placeholder values, which you can simply rename to `.env`.

Note the `VITE` prefix to the environment variables. This prefix is required for vite to expose the environment variable to the client. For more information, see the [vite documentation](https://vitejs.dev/guide/env-and-mode) on environment variables and modes.

```sh
VITE_HUME_API_KEY=<YOUR API KEY>
VITE_HUME_SECRET_KEY=<YOUR SECRET KEY>
```

2. [Create a tool](https://dev.hume.ai/docs/empathic-voice-interface-evi/tool-use#setup) with the following payload:

```json
{
  "name": "get_current_weather",
  "description": "This tool is for getting the current weather.",
  "parameters": "{ \"type\": \"object\", \"properties\": { \"location\": { \"type\": \"string\", \"description\": \"The city and state, e.g. San Francisco, CA\" }, \"format\": { \"type\": \"string\", \"enum\": [\"celsius\", \"fahrenheit\"], \"description\": \"The temperature unit to use. Infer this from the users location.\" } }, \"required\": [\"location\", \"format\"] }"
}
```

> See our documentation on [Setup for Tool Use](https://dev.hume.ai/docs/empathic-voice-interface-evi/tool-use#setup) for no-code and full-code guides on creating a tool and adding it to a configuration.

3. Create a configuration equiped with that tool: 
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

4. Add the Config ID to your environmental variables in your `.env` file:
```bash
VITE_HUME_WEATHER_ASSISTANT_CONFIG_ID=<YOUR CONFIG ID>
```

5. Add your Geocoding API key to your environmental variables (free to use from geocode.maps.co).
```bash
VITE_GEOCODING_API_KEY=<YOUR GEOCODING API KEY>
```

## Serve project

Below are the steps to run the project locally:

1. Run `pnpm i` to install required dependencies.
2. Run `pnpm build` to build the project.
3. Run `pnpm dev` to serve the project at `localhost:5173`.

## Usage

This implementation of Hume's Empathic User Interface (EVI) is minimal, using default configurations for the interface and a basic UI to authenticate, connect to, and disconnect from the interface.

1. Click the `Start` button to establish an authenticated connection and to begin capturing audio.
2. Upon clicking `Start`, you will be prompted for permissions to use your microphone. Grant the permission to the application to continue.
3. Once permission is granted, you can begin speaking with the interface. The transcript of the conversation will be displayed on the webpage in realtime.
4. Click `Stop` when finished speaking with the interface to stop audio capture and to disconnect the WebSocket.
