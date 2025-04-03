<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface | Next.js App Router Quickstart</h1>
</div>

![preview.png](preview.png)

## Overview

This project features a sample implementation of Hume's [Empathic Voice Interface](https://dev.hume.ai/docs/empathic-voice-interface-evi/overview) using Hume's [React SDK](https://github.com/HumeAI/empathic-voice-api-js/tree/main/packages/react). Here, we have a simple EVI that uses the Next.js App Router.

See the [Quickstart guide](https://dev.hume.ai/docs/empathic-voice-interface-evi/quickstart/nextjs) for a detailed explanation of the code in this project.

## Project deployment

Click the button below to deploy this example project with Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhumeai%2Fhume-evi-next-js-starter&env=HUME_API_KEY,HUME_CLIENT_SECRET)

Below are the steps to completing deployment:

1. Create a Git Repository for your project.
2. Provide the required environment variables. To get your API key and Secret key, log into the portal and visit the [API keys page](https://platform.hume.ai/settings/keys).

## Modify the project 

1. Clone this examples repository:

    ```shell
    git clone https://github.com/humeai/hume-api-examples
    cd hume-api-examples/evi/next-js/evi-next-js-app-router-quickstart
    ```

2. Install dependencies:
    ```shell
    npm install
    ```

3. Set up your API keys:

  * Visit the [API keys page](https://platform.hume.ai/settings/keys) on the Hume Platform to retrieve your API key. See our documentation on [getting your api keys](https://dev.hume.ai/docs/introduction/api-key).
  * Place your `HUME_API_KEY` and `HUME_SECRET_KEY` in a `.env` file at the project root. You can copy the `.env.example` file to use as a template:

    ```shell
    cp .env.example .env
    ```

4. Optional: Specify an EVI configuration:

  * EVI is pre-configured with a set of default values, which are automatically applied if you do not specify a configuration. The default configuration includes a preset voice and language model, but does not include a system prompt or tools. To customize these options, you will need to create and specify your own EVI configuration. To learn more, see our [configuration guide](https://dev.hume.ai/docs/empathic-voice-interface-evi/configuration/build-a-configuration).
  * You may pass in a configuration ID to the `VoiceProvider` object inside the [Chat.tsx file](https://github.com/HumeAI/hume-api-examples/blob/main/evi-next-js-app-router/components/Chat.tsx).

      Here's an example:
      ```tsx
      <VoiceProvider
        configId="YOUR_CONFIG_ID"
        auth={{ type: "accessToken", value: accessToken }}
      >
      ```

5. Run the project:
    ```shell
    npm run dev
    ```

