<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Hume AI Swift SDK Demo</h1>

  <p>
    <strong>A simple iOS app to demo the Hume Swift SDK</strong>
  </p>
</div>

## Documentation

API reference documentation is available [here](https://dev.hume.ai/reference/).

## Installation

The Demo will eventually be made available via TestFlight once Apple has completed
processing of the appropriate details.

## Development setup

To interact with the Hume API from a mobile client, we recommend using the [token strategy](https://dev.hume.ai/docs/introduction/api-key#authentication-strategies). 
In this example repo, we included a simple python server that demonstrates how to fetch an access token. To start the server, see the [README](access_token_service/README.md) for the service. For the client-side of this demonstration, see [AccessTokenClient](EVIExample/EVIDemo/Clients/AccessTokenClient.swift). 

## WIP

This is a very simple Demo which uses the [Hume Swift SDK](https://github.com/HumeAI/hume-swift-sdk) to interact
with the `/chat` WebSocket. It is capable of sending text and audio inputs through the API
and receiving and playing back messages from the Assistant.
