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

You'll need to add a file called EVIExample/Secrets.swift. The contents should be as the following:

```
//
//  Secrets.swift
//  EVIExample
//
//

class Secrets {
    static let apiKey: String = "YOUR_API_KEY"
    static let clientSecret: String = "YOUR_SECRET"
}
```

## WIP

This is a very simple Demo which uses the [Hume Swift SDK](https://github.com/HumeAI/hume-swift-sdk) to interact
with the `/chat` WebSocket. It is capable of sending text and audio inputs through the API
and receiving and playing back messages from the Assistant.
