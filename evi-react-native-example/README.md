<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface | Sample Flutter App</h1>
</div>

This project features a sample implementation of Hume's [Empathic Voice Interface](https://hume.docs.buildwithfern.com/docs/empathic-voice-interface-evi/overview) using React Native. 

**Targets:** The example supports iOS (web and android coming soon!)

## Instructions

1. Install and build
    ```shell
    # Install dependencies
    npm install
    
    # Prebuild, to include the `modules/audio` native module.
    npx expo prebuild --platform ios
    ```

2. Copy the `.env.example` included in the repository to `.env` and fill in `EXPO_PUBLIC_HUME_API_KEY` and `EXPO_PUBLIC_HUME_CONFIG_ID` appropriately, see our documentation on [getting your api keys](https://hume.docs.buildwithfern.com/docs/introduction/getting-your-api-key).

    **Note:** the `EXPO_PUBLIC_HUME_API_KEY` environment variable is for development only. In a production React Native app you should avoid building your api key into the app -- the client should fetch an access token from an endpoint on your server. You should supply the `MY_SERVER_AUTH_URL` environment variable and uncomment the call to `fetchAccessToken` in `App.tsx`.

3. Run the dev server

    ```shell
    npm run ios
    ```

## Notes
* **Echo cancellation**. Echo cancellation is important for a good user experience using EVI. Without echo cancellation, EVI will detect its own speech as user interruptions, and will cut itself off and become incoherent. 
  * Echo cancellation doesn't seem to work using the iOS simulator when forwarding audio from the host.
  * If you need to test using a simulator or emulator, or in an environment where echo cancellation is not provided, use headphones, or enable the mute button while EVI is speaking.

* Because community libraries like `expo-av` module do not support streaming audio recording or echo cancellation, it is necessary to write native code to interface with the microphone and speaker. The example app includes a `modules/audio` with a very simple audio interface written in Swift. It works in simple scenarios, but will not handle scenarios like selecting between multiple possible audio devices, gracefully handling when the user switches audio devices mid-conversation, handling audio interruptions like incoming phone calls, "ducking" audio from other apps that might be playing, etc. You should use the provided module as a starting point and extend it to meet your app's unique requirements.

* This example uses Expo 52, on which ["The New Architecture" is the default](https://docs.expo.dev/guides/new-architecture/). If you use an older version of Expo, you may need to adapt the example to get the native module to work in your app.
