<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { EmbeddedVoice as EA } from '@humeai/voice-embed';

const embed = ref(null);

onMounted(() => {
  // if the embed instance already exists, return
  if (embed.value !== null) {
    return;
  }

  // this creates a new instance of the EmbeddedVoice class
  embed.value = EA.create({
    auth: {
      type: 'apiKey',
      value: import.meta.env.VITE_HUME_API_KEY
    },
    onMessage: (message) => {
      console.log('received message:', message);
    }
  });

  // this will mount the embed iframe to the document body
  embed.value.mount();
})
</script>

<template></template>
