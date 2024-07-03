# Hume Raw Text Processor

## Summary

This project serves as an example implementation of our Expression Measurement (REST) API processing raw text using our [Typescript SDK](https://www.npmjs.com/package/hume).

## Running Locally

1. Clone the repo with `git clone origin https://github.com/HumeAI/hume-api-examples.git`

2. Navigate to project directory `cd typescript-raw-text-processor`

3. Install dependencies with `npm i`

4. Setup Environment Variables

   a. Create `.env` file based off of `.env.example`

   b. Copy/paste your API key in from the [Portal](https://beta.hume.ai/settings/keys).

5. Set configurations within the `src/index.ts` file.

   a. Specify which language.

   b. Copy and paste the text to be processed.

   c. Set Language Model configurations.

6. Run `npm run start` to process the specified text with the specified configurations and log predictions to the console.
