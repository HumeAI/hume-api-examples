<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Hume AI Swift SDK Demo</h1>

  <p>
    <strong>A simple iOS app to demo the TTS in the Hume Swift SDK</strong>
  </p>
</div>

## Documentation

API reference documentation is available [here](https://dev.hume.ai/reference/).

## Development setup

- To interact with the Hume API from a mobile client, use the [token strategy](https://dev.hume.ai/docs/introduction/api-key#authentication-strategies). 
- In this example repo, we included a simple python server that demonstrates how to fetch an access token. To start the server, see the [README](access_token_service/README.md) for the service. For the client-side of this demonstration, see [AccessTokenClient](HumeDemo/EVIDemo/Clients/AccessTokenClient.swift).
- By default, `AccessTokenClient` is configured on `localhost`, which will work with the simulator. If you build the app on device, you can set the IP address as the environment variable `ACCESS_TOKEN_HOST`. (Edit HumeDemo scheme > Arguments > Add `ACCESS_TOKEN_HOST` and set value)

## Installation

0. Clone this repo and download Xcode if you haven't already.
1. Open `HumeDemo.xcodeproj` in Xcode.
2. Run the access token server; modify the scheme if needed
3. Build and Run the project
