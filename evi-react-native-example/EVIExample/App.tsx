import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { HumeClient, type Hume } from 'hume'

import * as NativeAudio from './modules/audio';

interface ChatEntry {
  role: 'user' | 'assistant';
  timestamp: string;
  content: string;
}

const hume = new HumeClient({
  apiKey: process.env.EXPO_PUBLIC_HUME_API_KEY || ''
})
const App = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [chatEntries, setChatEntries] = useState<ChatEntry[]>([
    { role: 'assistant', timestamp: new Date().toString(), content: 'Hello! How can I help you today?' },
    { role: 'user', timestamp: new Date().toString(), content: 'I am beyond help' },

  ]);
  const [playbackQueue, setPlaybackQueue] = useState<any[]>([]);

  const chatSocketRef = useRef<Hume.empathicVoice.chat.ChatSocket | null>(null);

  useEffect(() => {
    if (isConnected) {
      NativeAudio.getPermissions().then(() => {
        NativeAudio.startRecording();
      }).catch((error) => {
        console.error('Failed to get permissions:', error);
      })
      const chatSocket = hume.empathicVoice.chat.connect({
        configId: process.env.EXPO_PUBLIC_HUME_CONFIG_ID,
      })
      chatSocket.on('message', handleIncomingMessage);

      chatSocket.on('error', (error) => {
        console.error("WebSocket Error:", error);
      });

      chatSocket.on('close', () => {
        console.log("WebSocket Connection Closed");
        setIsConnected(false);
      });

      chatSocketRef.current = chatSocket;

      NativeAudio.onAudioInput(({base64EncodedAudio}: NativeAudio.AudioEventPayload) => {
        chatSocket.sendAudioInput({data: base64EncodedAudio});
      })
    } else {
      NativeAudio.stopRecording();
    }
    return () => {
      NativeAudio.stopRecording();
      chatSocketRef.current?.close();
    }
  }, [isConnected]);

  const handleIncomingMessage = (message: any) => {
    if (message.type === 'audio_output') {
      const audioData = message.data;
      const decodedAudio = atob(audioData);
      playAudio(decodedAudio);
    } else if (message.type === 'chat_message') {
      const chatEntry: ChatEntry = {
        role: message.role === 'assistant' ? 'assistant' : 'user',
        timestamp: new Date().toString(),
        content: message.content,
      };
      setChatEntries((prev) => [...prev, chatEntry]);
    }
  };

  const connectToWebSocket = () => {
    setIsConnected(true);
  };

  const disconnectFromWebSocket = () => {
    if (chatSocketRef.current) {
      chatSocketRef.current.close();
    }
    setIsConnected(false);
  };

  const muteInput = () => {
    setIsMuted(true);
    NativeAudio.stopRecording();
  };

  const unmuteInput = () => {
    setIsMuted(false);
    NativeAudio.startRecording();
  };

  const playAudio = (audioData: string) => {
    if (playbackQueue.length > 0) {
      setPlaybackQueue((prev) => [...prev, audioData]);
    } else {
      NativeAudio.playAudio(audioData);
    }
  };

  return (
    <View style={styles.appBackground}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>You are {isConnected ? 'connected' : 'disconnected'}</Text>
        </View>
        <ScrollView style={styles.chatDisplay}>
          {chatEntries.map((entry, index) => (
            <View
              key={index}
              style={[
                styles.chatEntry,
                entry.role === 'user' ? styles.userChatEntry : styles.assistantChatEntry,
              ]}
            >
              <Text style={styles.chatText}>{entry.content}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.buttonContainer}>
          <Button
            title={isConnected ? 'Disconnect' : 'Connect'}
            onPress={isConnected ? disconnectFromWebSocket : connectToWebSocket}
          />
          <Button title={isMuted ? 'Unmute' : 'Mute'} onPress={isMuted ? unmuteInput : muteInput} />
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  appBackground: {
    flex: 1,
    backgroundColor: 'rgb(255, 244, 232)',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    maxWidth: 600,
    width: '100%'
  },
  header: {
    marginBottom: 16,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatDisplay: {
    flex: 1,
    width: '100%',
    marginBottom: 16,
  },
  chatEntry: {
    padding: 10,
    marginVertical: 5,
    borderRadius: 15,
    maxWidth: '75%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  userChatEntry: {
    backgroundColor: 'rgb(209, 226, 243)',
    alignSelf: 'flex-end',
    marginRight: 10,
  },
  assistantChatEntry: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    marginLeft: 10,
  },
  chatText: {
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});

export default App;
