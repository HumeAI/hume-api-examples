import React, { useState } from 'react';
import { HumeClient } from 'hume';

const App: React.FC = () => {
  const [text, setText] = useState("Hello world");
  const [isProcessing, setIsProcessing] = useState(false);

  const synthesize = async () => {
    if (!text.trim()) {
      alert("Please enter some text");
      return;
    }

    setIsProcessing(true);
    
    try {
      const humeClient = await authenticateHume();
      
      const stream = await humeClient.tts.synthesizeJsonStreaming({
        utterances: [{ text: text.trim(), voice: { name: 'Ava Song', provider: 'HUME_AI' } }],
        stripHeaders: false
      });

      // Collect audio data from stream
      const audioChunks: string[] = [];
      for await (const chunk of stream) {
        audioChunks.push(chunk.audio);
      }
      
      // Combine all audio chunks
      const combinedAudioString = audioChunks.join('');
      
      // Convert base64 string to Uint8Array
      const binaryString = atob(combinedAudioString);
      const audioData = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        audioData[i] = binaryString.charCodeAt(i);
      }

      // Simple audio playback
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(audioData.buffer);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
      
    } catch (error) {
      setIsProcessing(false);
      throw error
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>TTS React Quickstart</h1>
      
      <textarea 
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isProcessing}
        style={{ width: '100%', height: '100px', marginBottom: '10px' }}
      />
      
      <button 
        onClick={synthesize}
        disabled={isProcessing}
        style={{ padding: '10px 20px' }}
      >
        {isProcessing ? 'Synthesizing...' : 'Synthesize'}
      </button>
    </div>
  );
};

let _humeClient: HumeClient | null = null;
let _accessToken: string | null = null;

const authenticateHume = async (): Promise<HumeClient> => {
  if (_humeClient) {
    return _humeClient;
  }
  const result = await fetch("http://localhost:8080/access-token");
  const { accessToken } = await result.json();
  const humeClient = new HumeClient({ accessToken });
  _humeClient = humeClient;
  return humeClient;
}

export default App;