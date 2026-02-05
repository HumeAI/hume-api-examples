<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { EmbeddedVoice as EA } from '@humeai/voice-embed';

const embed = ref<ReturnType<typeof EA.create> | null>(null);

onMounted(() => {
  // if the embed instance already exists, return
  if (embed.value !== null) {
    return;
  }

  // this creates a new instance of the EmbeddedVoice class
  const instance = EA.create({
    auth: {
      type: 'apiKey',
      value: import.meta.env.VITE_HUME_API_KEY,
    },
    onMessage: (message) => {
      console.log('received message:', message);
    },
  });

  embed.value = instance;
  // mount the embed iframe to the document body
  instance.mount();
});
</script>

<template></template>
