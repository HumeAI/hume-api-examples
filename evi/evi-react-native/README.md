<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface | React Native Example</h1>
</div>

## Overview

This project features a sample implementation of Hume's [Empathic Voice Interface (EVI)](https://dev.hume.ai/docs/empathic-voice-interface-evi/overview) using React Native. 

**Targets:** The example supports iOS and web (Android support coming soon!)

## Setup Instructions

1. Clone this examples repository:

    ```shell
    git clone https://github.com/humeai/hume-api-examples
    cd hume-api-examples/evi/evi-react-native
    ```

2. Set up API credentials:

    - **Obtain Your API Key**: Follow the instructions in the [Hume documentation](https://dev.hume.ai/docs/introduction/api-key) to acquire your API key.
    - **Create a `.env` File**: Copy the `.env.example` included in the repository to `.env` and fill in `EXPO_PUBLIC_HUME_API_KEY` and `EXPO_PUBLIC_HUME_CONFIG_ID` appropriately:

      ```sh
      EXPO_PUBLIC_HUME_API_KEY="<YOUR_API_KEY>"
      EXPO_PUBLIC_HUME_CONFIG_ID="<YOUR_CONFIG_ID>"
      ```

    **Note:** the `EXPO_PUBLIC_HUME_API_KEY` environment variable is for development only. In a production React Native app you should avoid building your api key into the app -- the client should fetch an access token from an endpoint on your server. You should supply the `MY_SERVER_AUTH_URL` environment variable and uncomment the call to `fetchAccessToken` in `App.tsx`.

3. Install dependencies:
    ```shell
    npm install
    ```

4. Prebuild, to include the `modules/audio` native module:
    ```shell
    npx expo prebuild --platform ios
    ```

## Usage

Run the dev server:

  ```shell
  npm run ios
  ```

## 📝 Notes
* **Echo cancellation**. Echo cancellation is important for a good user experience using EVI. Without echo cancellation, EVI will detect its own speech as user interruptions, and will cut itself off and become incoherent. 
  * Echo cancellation doesn't seem to work using the iOS simulator when forwarding audio from the host.
  * If you need to test using a simulator or emulator, or in an environment where echo cancellation is not provided, use headphones, or enable the mute button while EVI is speaking.

* Community libraries like `expo-av` module do not support streaming audio recording or echo cancellation. For iOS, the example app includes a `modules/audio` native module that does audio processing via the `AudioHub` class provided by the [Hume Swift SDK](https://github.com/humeai/hume-swift-sdk) beta. This means you should expect roughly the same audio processing experience as is available in the [Hume iOS App](https://apps.apple.com/us/app/hume-your-personal-ai/id6502917807). (The one difference is that audio bytes in this example flow Native -> Javascript -> Network, instead of Native -> Network directly.) On Web, the example uses the `EVIWebAudioPlayer` interface from the Typescript SDK.

