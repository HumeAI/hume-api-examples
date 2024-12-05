<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface | Chat History</h1>
  <p>
    <strong>Parse Chat Events for Chat transcription</strong>
  </p>
</div>

## Overview

This project demonstrates how to fetch all chat events from Hume's Empathic Voice Interface (EVI) using Hume's TypeScript SDK. It:

- Fetches all chat events for a specified chat ID.
- Parses user and assistant messages.
- Saves the formatted transcript to a text file.

## Prerequisites

To run this project locally, ensure your development environment meets the following requirements:

- [Node.js](https://nodejs.org/en) (`v18.0.0` or higher)
- [npm](https://pnpm.io/installation) (`v8.0.0` or higher)

To check the versions of `npm` and `Node.js` installed on a Mac via the terminal, you can use the following commands:

1. **For Node.js**, enter the following command and press Enter:

```bash
node -v
```

This command will display the version of Node.js currently installed on your system, for example, `v21.6.1`.

2. **For npm**, type the following command and press Enter:

```bash
npm -v
```

This command will show the version of `npm` that is installed, like `8.10.0`.

If needed, download Node.js from the [official website](https://nodejs.org/en/).

### Set API credentials

Next you'll need to set your environment variables necessary for authentication. You'll need your API key which is accessible from the Platform. See our documentation on [getting your api keys](https://hume.docs.buildwithfern.com/docs/introduction/getting-your-api-key).

After obtaining your API key, you need to set them as environment variables within a file named `.env` in this project's root directory.

```sh
HUME_API_KEY="<YOUR_API_KEY>"
```

> There is an example file called [`.env.example`](https://github.com/HumeAI/hume-api-examples/blob/main/evi-typescript-example/.env.example). Create a `.env` file, copy/paste the contents of the `.env.example` file, and fill in your environment variables.

### Set the Chat ID

Lastly, you'll need to set your Chat ID within the main function of the source code for which chat you want to fetch the transcript for.

```TypeScript
async function run() {
  const chatId = "<YOUR_CHAT_ID>"; // Replace with your actual Chat ID

  try {
    const chatEvents = await fetchAllChatEvents(chatId);
    parseAndSaveTranscript(chatId, chatEvents);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}
```

## Serve project

Below are the steps to run the project locally:

1. Run `npm i` to install required dependencies.
2. Run `npm run dev` to build and run the project.

