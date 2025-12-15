<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Expression Measurement | TypeScript Raw Text Processor</h1>
  <p>
    <strong>Batch-analyze Text using Hume's TypeScript SDK.</strong>
  </p>
</div>

## Overview

This project serves as an example implementation of our Expression Measurement (REST) API processing raw text using our [Typescript SDK](https://www.npmjs.com/package/hume).

## Running Locally

1. Clone this examples repository:

    ```shell
    git clone https://github.com/humeai/hume-api-examples
    cd hume-api-examples/expression-measurement/batch/typescript-raw-text-processor
    ```

2. Install dependencies:

    ```shell
    npm install
    ```

3. Set up your API key:

    You must authenticate to use the Hume Expression Measurement API. Your API key can be retrieved from the [Hume AI platform](https://app.hume.ai/keys). For detailed instructions, see our documentation on [getting your api keys](https://dev.hume.ai/docs/introduction/api-key).

    This example uses [dotenv](https://www.npmjs.com/package/dotenv). Place your API key in a `.env` file at the root of your project.

    ```shell
    echo "HUME_API_KEY='<YOUR API KEY>'" > .env
    ```

    You can copy the `.env.example` file to use as a template.

4. Set configurations within the `src/index.ts` file.

   a. Specify which language.

   b. Copy and paste the text to be processed.

   c. Set Language Model configurations.

5. Run `npm run start` to process the specified text with the specified configurations and log predictions to the console.
