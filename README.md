<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Hume API Examples</h1>
  <p>
    <strong>Browse sample code and projects designed to help you integrate Hume APIs</strong>
  </p>
  <p>
    <a href="https://docs.hume.ai">📘 Documentation</a> •
    <a href="https://discord.com/invite/humeai">💬 Join us on Discord</a> •
    <a href="https://dev.hume.ai/docs/introduction/api-key">🔐 Getting your API Keys</a>
  </p>
</div>

## Overview

Welcome to the official Hume API Examples repository!
Here you'll find open-source example projects and quickstart guides to help you integrate the [Hume API](https://docs.hume.ai) across a variety of languages and frameworks.

Use these examples to:

- Add empathic Text-to-Speech (TTS) to your application
- Build rich conversational agents with the Empathic Voice Interface (EVI)
- Measure expressions with facial, vocal, and language-based analysis

Whether you're using Python, TypeScript, Flutter, or Next.js, there's something here to help you get started quickly.

## [Text-to-Speech (TTS)](https://dev.hume.ai/docs/text-to-speech-tts/overview)

| Name                                                                                    | Language   | Framework       |
| --------------------------------------------------------------------------------------- | ---------- | --------------- |
| [`tts-python-quickstart`](/tts/tts-python-quickstart/README.md)                         | Python     |                 |
| [`tts-typescript-quickstart`](/tts/tts-typescript-quickstart/README.md)                 | TypeScript |                 |

## [Empathic Voice Interface (EVI)](https://dev.hume.ai/docs/empathic-voice-interface-evi/overview)

| Name                                                                                       | Language   | Framework       |
| ------------------------------------------------------------------------------------------ | ---------- | --------------- |
| [`evi-flutter`](/evi/evi-flutter/README.md)                                                | Dart       | Flutter         |
| [`evi-next-js-app-router-quickstart`](/evi/evi-next-js-app-router-quickstart/README.md)    | TypeScript | Next.js         |
| [`evi-next-js-pages-router-quickstart`](/evi/evi-next-js-pages-router-quickstart/README.md)| TypeScript | Next.js         |
| [`evi-next-js-function-calling`](/evi/evi-next-js-function-calling/README.md)              | TypeScript | Next.js         |
| [`evi-prompting-examples`](/evi/evi-prompting-examples/README.md)                          |            |                 |
| [`evi-python-chat-history`](/evi/evi-python-chat-history/README.md)                        | Python     |                 |
| [`evi-python-clm-sse`](/evi/evi-python-clm-sse/README.md)                                  | Python     |                 |
| [`evi-python-clm-wss`](/evi/evi-python-clm-wss/README.md)                                  | Python     |                 |
| [`evi-python-function-calling`](/evi/evi-python-function-calling/README.md)                | Python     |                 |
| [`evi-python-quickstart`](/evi/evi-python-quickstart/README.md)                            | Python     |                 |
| [`evi-python-raw-api`](/evi/evi-python-raw-api/README.md)                                  | Python     |                 |
| [`evi-python-webhooks`](/evi/evi-python-webhooks/README.md)                                | Python     | FastAPI         |
| [`evi-python-wss-clm-endpoint`](/evi/evi-python-wss-clm-endpoint/)                         | Python     | Modal           |
| [`evi-react-native`](/evi/evi-react-native/README.md)                                      | TypeScript | React Native    |
| [`evi-touchdesigner`](/evi/evi-touchdesigner/README.md)                                    | Python     | TouchDesigner   |
| [`evi-typescript-chat-history`](/evi/evi-typescript-chat-history/README.md)                | TypeScript |                 |
| [`evi-typescript-quickstart`](/evi/evi-typescript-quickstart/README.md)                    | TypeScript |                 |
| [`evi-typescript-webhooks`](/evi/evi-typescript-webhooks/README.md)                        | TypeScript | Express         |
| [`evi-vue-widget`](/evi/evi-vue-widget/README.md)                                          | TypeScript | Vue             |

## [Expression Measurement API](https://dev.hume.ai/docs/expression-measurement-api/overview)

| Name                                                                                                     | Models                                | Language   | Framework   |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------- | ----------- |
| [`visualization-example`](/expression-measurement/visualization-example/example-notebook.ipynb)          | `face`                                | Python     |             |
| [`python-top-emotions`](/expression-measurement/batch/python-top-emotions/README.md)                     | `face`                                | Python     |             |
| [`typescript-raw-text-processor`](/expression-measurement/batch/typescript-raw-text-processor/README.md) | `language`                            | TypeScript |             |
| [`next-js-emotional-language`](/expression-measurement/batch/next-js-emotional-language/README.md)       | `language`                            | TypeScript | Next.js     |
| [`next-js-streaming-example`](/expression-measurement/streaming/next-js-streaming-example/README.md)     | `language`, `face`, `burst`, `speech` | TypeScript | Next.js     |

## Authentication & Setup

 You must authenticate to use the Hume API. Your API key can be retrieved from the [Hume AI platform](https://platform.hume.ai/settings/keys). For detailed instructions, see our documentation on [getting your api keys](https://dev.hume.ai/docs/introduction/api-key).

 Each example project includes a `README.md` file with step-by-step instructions on:
 - Setting your API key (usually via environment variables)
 - Installing dependencies
 - Running the example

## License

All projects are licensed under the MIT License - see the [LICENSE.txt](/LICENSE) file for details.