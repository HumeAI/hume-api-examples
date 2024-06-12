# Meld: a sample React application for brainstorming with EVIs

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Description

This example project showcases the use of Hume AI's Empathic Voice Interface (EVI) to boost brainstorming sessions through a React-based application.

Utilizing a unique system prompt, EVI can adopt three distinct personas, providing diverse insights tailored to your topics. With our [System Prompt](https://github.com/HumeAI/meld/blob/main/src/system_prompt.txt) we define three distinct personas EVI will take to provide insights our topic.

This project leverages [Hume's React SDK](https://github.com/HumeAI/empathic-voice-api-js/tree/main/packages/react), a straightforward React interface, designed to seamlessly integrate EVI capabilities into your React applications.

## Table of Contents

- [EVI brainstorming team example](#evi-brainstorming-team-example)
  - [Description](#description)
  - [Table of Contents](#table-of-contents)
  - [Setup](#setup)
  - [Usage](#usage)
  - [License](#license)

## Setup

### Configuring Environment Variables

Start by setting up your environment variables. Create a .env file and add your [API Key and your Secret Key](https://beta.hume.ai/settings/keys):

```bash
echo "VITE_HUME_API_KEY= <YOUR HUME API KEY>" >> .env
echo "VITE_HUME_SECRET_KEY = <YOUR HUME SECRET KEY>" >> .env
```

### Installing Dependencies

Install all required dependencies by running:

```bash
pnpm install
```

## Usage

### Configuring EVI

First, create an EVI configuration with the [provided system prompt](https://github.com/HumeAI/meld/blob/main/src/system_prompt.txt). Once the configuration has been created, set your `config_id` in `src/App.tsx`.

Learn how to create your config and get your `config_id` [here](https://dev.hume.ai/docs/empathic-voice-interface-evi/configuration).

### Running the Application

Start the application locally with:

```bash
pnpm dev
```

Visit [http://localhost:5173/](http://localhost:5173/) in your browser to interact with the project.

## License

This project is licensed under the [MIT License](LICENSE).
