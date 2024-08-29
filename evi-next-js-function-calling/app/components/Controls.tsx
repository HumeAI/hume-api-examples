'use client';
import { useVoice, VoiceReadyState } from '@humeai/voice-react';
import React from 'react';

export default function Controls() {
  const { connect, disconnect, readyState } = useVoice();

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Error connecting:', error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  return (
    <button
      onClick={readyState === VoiceReadyState.OPEN ? handleDisconnect : handleConnect}
    >
      {readyState === VoiceReadyState.OPEN ? 'End Session' : 'Start Session'}
    </button>
  );
}