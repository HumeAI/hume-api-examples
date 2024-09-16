<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>EVI TouchDesigner Example</h1>
</div>

## Overview

This project demonstrates a sample implementation of Hume AI's [Empathic Voice Interface](https://hume.docs.buildwithfern.com/docs/empathic-voice-interface-evi/overview) within a TouchDesigner environment. For now, this project uses text input only.

- `HumeTD.tox` is a portable component you can drop in your project
- `HumeTDDemo.toe` is a sample project using `HumeTD.tox`

## Setup

1. Acquire your API key from [platform.hume.ai](https://platform.hume.ai/settings/keys)
2. Drop `HumeTD.tox` into your own project
2. Add your API key in the `Custom` panel of the `HumeTD` component
3. *Optional:* Add a custom EVI configuration 

![setup.png](setup.png)

## Using HumeTD.tox

1. You can send a message from anywhere in your project using `op.HumeTD.Send_user_message('Your message here')`
2. The `HumeTD` component has an audio output with EVI's audio responses

Below is a network with a minimal implementation. You would simply right click and "Run Script" the pink `Text OP`

![simple.png](simple.png)