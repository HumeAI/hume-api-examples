import Avatars from '@components/Avatars';
import { useVoice } from '@humeai/voice-react';
import { AvatarProvider } from '@store/AvatarProvider';
import React from 'react';
import { match } from 'ts-pattern';

/**
 * Main view for displaying the avatars and conversation
 */
const ChatStage: React.FC = () => {
  const { connect, disconnect, status } = useVoice();

  const handleConnect = () => {
    if (status.value === 'connected') {
      disconnect();
      return;
    }
    void connect()
      .then(() => {})
      .catch((e) => {
        console.error(e);
      });
  };

  return (
    <div className="font-nationalPark absolute inset-0 size-full bg-blue-50 flex flex-col justify-center items-center">
      <h1 className="absolute top-6 text-4xl font-bold">MindMeld</h1>
      <div>
        {match(status.value)
          .with('error', () => {
            return (
              <div>
                <p>Something went wrong</p>
                <button onClick={() => handleConnect()}>Try again</button>
              </div>
            );
          })
          .with('disconnected', 'connecting', () => {
            return <div></div>;
          })
          .with('connected', () => {
            return (
              <AvatarProvider>
                <Avatars />
              </AvatarProvider>
            );
          })
          .exhaustive()}
      </div>
      <button
        onClick={() => handleConnect()}
        className="absolute bottom-12 w-48 bg-blue-200 px-6 py-4 rounded-full 9 font-bold border-4 border-black text-xl hover:bg-blue-200/60 transition"
      >
        {status.value === 'connected' ? 'End chat' : 'Start chat!'}
      </button>
    </div>
  );
};

export default ChatStage;
