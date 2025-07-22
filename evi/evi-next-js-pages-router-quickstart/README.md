<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface | Next.js Pages Router Quickstart</h1>
</div>

![preview.png](preview.png)

## Overview

This project features a sample implementation of Hume's [Empathic Voice Interface](https://dev.hume.ai/docs/empathic-voice-interface-evi/overview) using Hume's [React SDK](https://github.com/HumeAI/empathic-voice-api-js/tree/main/packages/react). Here, we have a simple EVI that uses the Next.js Pages Router.

See the [Quickstart guide](https://dev.hume.ai/docs/empathic-voice-interface-evi/quickstart/nextjs) (Pages Router tab) for a detailed explanation of the code in this project.

## Project deployment

Click the button below to deploy this example project with Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhumeai%2Fhume-evi-next-js-starter&env=HUME_API_KEY,HUME_CLIENT_SECRET)

Below are the steps to completing deployment:

1. Create a Git Repository for your project.
2. Provide the required environment variables. To get your API key and Secret key, log into the Hume AI Platform and visit the [API keys page](https://platform.hume.ai/settings/keys).

## Modify the project

1. Clone this examples repository:

   ```shell
   git clone https://github.com/humeai/hume-api-examples
   cd hume-api-examples/evi/evi-next-js-pages-router-quickstart
   ```

2. Install dependencies:

   ```shell
   pnpm install
   ```

3. Set up your API key and Secret key:

   In order to make an authenticated connection we will first need to generate an access token. Doing so will require your API key and Secret key. These keys can be obtained by logging into the Hume AI Platform and visiting the [API keys page](https://platform.hume.ai/settings/keys). For detailed instructions, see our documentation on [getting your api keys](https://dev.hume.ai/docs/introduction/api-key).

   Place your `HUME_API_KEY` and `HUME_SECRET_KEY` in a `.env` file at the root of your project.

   ```shell
   echo "HUME_API_KEY=your_api_key_here" > .env
   echo "HUME_SECRET_KEY=your_secret_key_here" >> .env
   ```

   You can copy the `.env.example` file to use as a template.

4. Specify an EVI configuration (Optional):

   EVI is pre-configured with a set of default values, which are automatically applied if you do not specify a configuration. The default configuration includes a preset voice and language model, but does not include a system prompt or tools. To customize these options, you will need to create and specify your own EVI configuration. To learn more, see our [configuration guide](https://dev.hume.ai/docs/empathic-voice-interface-evi/configuration/build-a-configuration).

   Pass in a configuration ID to the `connect` method inside the [components/StartCall.tsx file](https://github.com/HumeAI/hume-api-examples/blob/main/evi/evi-next-js-pages-router-quickstart/components/StartCall.tsx).

   ```tsx
   connect({
      auth: { type: "accessToken", value: accessToken },
      configId: "<YOUR_CONFIG_ID>"
   })
   ```

5. Run the project:
   ```shell
   pnpm run dev
   ```
