<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface | Vue Widget</h1>
</div>

## Overview

This project features a sample implementation of Hume's [Empathic Voice Interface (EVI)](https://dev.hume.ai/docs/empathic-voice-interface-evi/overview) as an embedded iframe in a Vue project. It leverages the Hume [Voice Embed SDK](https://github.com/HumeAI/empathic-voice-api-js/tree/main/packages/embed) to initialize and mount the interface. 

## 🔧 Setup Instructions

1. **Clone this examples repository**

    ```shell
    git clone https://github.com/humeai/hume-api-examples
    cd hume-api-examples/evi/evi-vue-widget
    ```

2. **Set up API credentials**

    - **Obtain Your API Key**: Follow the instructions in the [Hume documentation](https://dev.hume.ai/docs/introduction/api-key) to acquire your API key.
    - **Create a `.env` File**: Copy the `.env.example` included in the repository to `.env` and fill in `VITE_HUME_API_KEY`:

      ```sh
      VITE_HUME_API_KEY="<YOUR_API_KEY>"
      ```

3. Install dependencies
   ```shell
   pnpm install
   ```

4. Run the development server
   ```shell
   pnpm dev
   ```
