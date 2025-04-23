<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface | Next.js Function Calling Example</h1>
</div>

![preview.png](preview.png)

## Overview

This project features a sample implementation of Hume's [Empathic Voice Interface](https://dev.hume.ai/docs/empathic-voice-interface-evi/overview) using Hume's [React SDK](https://github.com/HumeAI/empathic-voice-api-js/tree/main/packages/react). Here, we have a simple EVI that calls a function to get the weather for a given location.

See the [Tool Use guide](https://dev.hume.ai/docs/empathic-voice-interface-evi/features/tool-use) for a detailed explanation of the code in this project.

## EVI setup

1. [Create a tool](https://dev.hume.ai/docs/empathic-voice-interface-evi/tool-use#create-a-tool) with the following payload:

   Sample JSON Request Body

   ```json
   {
     "name": "get_current_weather",
     "description": "This tool is for getting the current weather in a given locale.",
     "version_description": "Fetches current weather and uses celsius or fahrenheit based on location of user.",
     "parameters": "{ \"type\": \"object\", \"properties\": { \"location\": { \"type\": \"string\", \"description\": \"The city and state, e.g. San Francisco, CA\" }, \"format\": { \"type\": \"string\", \"enum\": [\"celsius\", \"fahrenheit\"], \"description\": \"The temperature unit to use. Infer this from the users location.\" } }, \"required\": [\"location\", \"format\"] }",
     "fallback_content": "The weather API is unavailable. Unable to fetch the current weather."
   }
   ```

   Sample cURL Request

   ```cURL
   curl https://api.hume.ai/v0/evi/tools \
      -H "X-Hume-Api-Key: <YOUR_API_KEY>" \
      --json '{
         "name": "get_current_weather",
         "description": "This tool is for getting the current weather in a given locale.",
         "version_description": "Fetches current weather and uses celsius or fahrenheit based on location of user.",
         "parameters": "{ \"type\": \"object\", \"properties\": { \"location\": { \"type\": \"string\", \"description\": \"The city and state, e.g. San Francisco, CA\" }, \"format\": { \"type\": \"string\", \"enum\": [\"celsius\", \"fahrenheit\"], \"description\": \"The temperature unit to use. Infer this from the users location.\" } }, \"required\": [\"location\", \"format\"] }",
         "fallback_content": "The weather API is unavailable. Unable to fetch the current weather."
      }'
   ```

2. [Create a configuration](https://dev.hume.ai/docs/empathic-voice-interface-evi/tool-use#create-a-configuration) equipped with that tool:

   Sample JSON Request Body

   ```json
   {
     "evi_version": "2",
     "name": "Weather Assistant Config",
     "language_model": {
       "model_provider": "ANTHROPIC",
       "model_resource": "claude-3-7-sonnet-latest"
     },
     "tools": [
       {
         "id": "<YOUR_TOOL_ID>"
       }
     ]
   }
   ```

   Sample cURL Request

   ```cURL
   curl -X POST https://api.hume.ai/v0/evi/configs \
      -H "X-Hume-Api-Key: <YOUR_API_KEY>" \
      -H "Content-Type: application/json" \
      -d '{
         "evi_version": "2",
         "name": "Weather Assistant Config",
         "language_model": {
            "model_provider": "ANTHROPIC",
            "model_resource": "claude-3-7-sonnet-latest"
         },
         "tools": [
            {
               "id": "<YOUR_TOOL_ID>"
            }
         ]
      }'
   ```

## Instructions

1. Clone this examples repository:

   ```shell
   git clone https://github.com/humeai/hume-api-examples
   cd hume-api-examples/evi/evi-next-js-function-calling
   ```

2. Install dependencies:

   ```shell
   npm install
   ```

3. Set up your API key and Secret key:

   In order to make an authenticated connection we will first need to generate an access token. Doing so will require your API key and Secret key. These keys can be obtained by logging into the Hume AI Platform and visiting the [API keys page](https://platform.hume.ai/settings/keys). For detailed instructions, see our documentation on [getting your api keys](https://dev.hume.ai/docs/introduction/api-key).

   Place your `HUME_API_KEY` and `HUME_SECRET_KEY` in a `.env` file at the root of your project.

   ```shell
   echo "HUME_API_KEY=your_api_key_here" > .env
   echo "HUME_SECRET_KEY=your_secret_key_here" >> .env
   ```

   You can copy the `.env.example` file to use as a template.

4. Add your Config ID to the `.env` file. This ID should be from the EVI configuration you created earlier that includes your weather tool.

   ```shell
   echo "NEXT_PUBLIC_HUME_CONFIG_ID=your_config_id_here" >> .env
   ```

5. Add your Geocoding API key to the `.env` file. You can obtain it for free from [geocode.maps.co](https://geocode.maps.co/).

   ```shell
   echo "GEOCODING_API_KEY=your_geocoding_api_key_here" >> .env
   ```

6. Run the project:

   ```shell
   npm run dev
   ```

   This will start the Next.js development server, and you can access the application at `http://localhost:3000`.

## Example Conversation

Here's an example of how you might interact with the EVI to get weather information:

_User: "What's the weather like in New York City?"_

_EVI: (Uses the get_current_weather tool to fetch data) "Currently in New York City, it's 72°F (22°C) and partly cloudy. The forecast calls for a high of 78°F (26°C) and a low of 65°F (18°C) today."_

## License

This project is licensed under the MIT License - see the [LICENSE.md](https://github.com/HumeAI/hume-api-examples/blob/main/LICENSE) file for details.
