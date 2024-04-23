import { fetchAccessToken } from '@humeai/voice';
import { VoiceProvider } from '@humeai/voice-react';
import { useEffect, useState } from 'react';
import ChatStage from '@components/ChatStage';

function App() {
  const [accessToken, setAccessToken] = useState('');

  useEffect(() => {
    const fetchToken = async () => {
      // make sure to set these environment variables
      const apiKey = import.meta.env.VITE_HUME_API_KEY || '';
      const clientSecret = import.meta.env.VITE_HUME_CLIENT_SECRET || '';
      
      const token = (await fetchAccessToken({ apiKey, clientSecret })) || '';

      setAccessToken(token);
    };

    fetchToken();
  }, []);

  return (
    <>
      <VoiceProvider
        auth={{ type: 'accessToken', value: accessToken }}
        configId={'<YOUR CONFIG ID>'} // set your configId here
      >
        <ChatStage />
      </VoiceProvider>
    </>
  );
}

export default App;
