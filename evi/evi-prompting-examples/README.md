<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface | Prompt Examples</h1>
</div>

# EVI Prompt Examples

This folder contains example prompts for Hume's [Empathic Voice Interface](https://dev.hume.ai/docs/empathic-voice-interface-evi/overview), designed to illustrate the principles outlined in our [EVI Prompting Guide](https://dev.hume.ai/docs/empathic-voice-interface-evi/guides/prompting). Remember to tailor the prompts to your specific use case and audience for the best results!

## Contents

- `default_prompt.txt`: This is our default prompt for EVI, used when no custom prompt is provided and a supplemental LLM is selected. It demonstrates the principles outlined in the prompting guide working together. The prompt covers aspects such as role definition, communication style, response formatting, expression handling, tool use, and prompting for voice-only conversations.
- `deeper_questions_prompt.txt`: The prompt used for the Deeper Questions character in [app.hume.ai/talk](https://app.hume.ai/talk). It is designed for conversations that build up memory over time, enabling EVI to better understand users and engage in deeper, more meaningful discussions through personalized questions and contextual awareness. It also demonstrates how to use [dynamic variables](https://dev.hume.ai/docs/empathic-voice-interface-evi/features/dynamic-variables) within the prompt to add user-specific information.