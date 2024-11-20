import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  LayoutAnimation,
} from "react-native";
import {useEvent} from 'expo'

// We use Hume's low-level typescript SDK for this example.
// The React SDK (@humeai/voice-react) does not support React Native.
import { HumeClient, type Hume } from "hume";

// An expo native module is included with this example to handle audio
// recording and playback. While some react-native libraries are available,
// none both provide a streaming interface and support for enabling echo
// cancellation, which is necessary for a good user experience with EVI.
//
// The provided native module is a good starting place, but you should
// modify it to fit the audio recording needs of your specific app.
import NativeAudio, { AudioEventPayload } from "./modules/audio";

// Represents a chat message in the chat display.
interface ChatEntry {
  role: "user" | "assistant";
  timestamp: string;
  content: string;
}


/**
 * An AudioClip is a function that you can call to play some audio.
 * It returns a promise that is resolved when the audio is finished playing.
 */
type AudioClip = () => Promise<void>;

// EVI can send audio output messages faster than they can be played back.
// It is important to buffer them in a queue so as not to cut off a clip of
// playing audio with a more recent clip. `audioQueue` is a global
// audio queue that manages this buffering.
const audioQueue = {
  clips: [] as Array<AudioClip>,
  currentlyPlaying: false,

  advance() {
    if (this.clips.length === 0) {
      this.currentlyPlaying = false;
      return;
    }
    const nextClip = this.clips.shift()!;
    nextClip().then(() => this.advance());
    this.currentlyPlaying = true;
  },

  add(clip: AudioClip) {
    this.clips.push(clip);

    if (!this.currentlyPlaying) {
      this.advance();
    }
  },

  clear() {
    this.clips = [];
    this.currentlyPlaying = false;
  },
};

// WARNING! For development only. In production, the app should hit your own backend server to get an access token, using "token authentication" (see https://dev.hume.ai/docs/introduction/api-key#token-authentication)
const humeClientWithApiKey = () => {
  return new HumeClient({
    apiKey: process.env.EXPO_PUBLIC_HUME_API_KEY || "",
  });
}

// For production use. Uncomment the call site within `startClient` to use.
const humeClientWithAccessToken = async () => {
  const url = process.env.EXPO_PUBLIC_MY_SERVER_AUTH_URL
  if (!url) {
    throw new Error("Please set EXPO_PUBLIC_MY_SERVER in your .env file");
  }
  const response = await fetch(url);
  const { accessToken } = await response.json();
  return new HumeClient({
    accessToken,
  });
}

const App = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [chatEntries, setChatEntries] = useState<ChatEntry[]>([]);
  const humeRef = useRef<HumeClient | null>(null);
  const addChatEntry = (entry: ChatEntry) => {
    setChatEntries((prev) => [...prev, entry]);
  };
  const startClient = async () => {
    // Uncomment this to use an access token in production.
    // humeRef.current = await humeClientWithAccessToken();

    // For development only.
    humeRef.current = humeClientWithApiKey();
  }

  // Scroll to the bottom of the chat display when new messages are added
  const scrollViewRef = useRef<ScrollView | null>(null);
  useEffect(() => {
    if (scrollViewRef.current) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      scrollViewRef.current.scrollToEnd();
    }
  }, [chatEntries]);

  const chatSocketRef = useRef<Hume.empathicVoice.chat.ChatSocket | null>(null);

  const handleConnect = async () => {
    // Access tokens expire, so the best practice is to initialize
    // a Hume Client with a new access token at the start of each
    // chat session.
    await startClient();
    const hume = humeRef.current!;
    try {
      await NativeAudio.getPermissions();
    } catch (error) {
      console.error("Failed to get permissions:", error);
    }
    try {
      await NativeAudio.startRecording();
    } catch (error) {
      console.error("Failed to start recording:", error);
    }

    const chatSocket = hume.empathicVoice.chat.connect({
      configId: process.env.EXPO_PUBLIC_HUME_CONFIG_ID,
    });
    chatSocket.on("open", () => {
      // The code within the native modules converts the default system audio format
      // system audio to linear 16 PCM, a standard format recognized by EVI. For linear16 PCM
      // you must send a `session_settings` message to EVI to inform EVI of the
      // correct sampling rate.
      if (NativeAudio.isLinear16PCM) {
        chatSocket.sendSessionSettings({
          audio: {
            encoding: "linear16",
            channels: 1,
            sampleRate: NativeAudio.sampleRate,
          },
        });
      }
    });
    chatSocket.on("message", handleIncomingMessage);

    chatSocket.on("error", (error) => {
      console.error("WebSocket Error:", error);
    });

    chatSocket.on("close", () => {
      setIsConnected(false);
    });

    chatSocketRef.current = chatSocket;


    NativeAudio.addListener('onAudioInput',
      ({ base64EncodedAudio }: AudioEventPayload) => {
        if (chatSocket.readyState !== WebSocket.OPEN) {
          return;
        }
        chatSocket.sendAudioInput({ data: base64EncodedAudio });
      }
    );
  };

  const handleDisconnect = async () => {
    try {
      await NativeAudio.stopRecording();
      await NativeAudio.stopPlayback();
    } catch (error) {
      console.error("Error while stopping recording", error);
    }
    if (chatSocketRef.current) {
      chatSocketRef.current.close();
    }
  };

  useEffect(() => {
    if (isConnected) {
      handleConnect().catch((error) => {
        console.error("Error while connecting:", error);
      });
    } else {
      handleDisconnect().catch((error) => {
        console.error("Error while disconnecting:", error);
      });
    }
    const onUnmount = () => {
      NativeAudio.stopRecording().catch((error: any) => {
        console.error("Error while stopping recording", error);
      });
      if (
        chatSocketRef.current &&
        chatSocketRef.current.readyState === WebSocket.OPEN
      ) {
        chatSocketRef.current?.close();
      }
    };
    return onUnmount;
  }, [isConnected]);

  useEffect(() => {
    if (isMuted) {
      NativeAudio.mute().catch((error) => {
        console.error("Error while muting", error);
      });
    } else {
      NativeAudio.unmute().catch((error) => {
        console.error("Error while unmuting", error);
      });
    }
  }, [isMuted]);

  const handleInterruption = () => {
    console.log("Clearing audio queue...");
    audioQueue.clear();
    NativeAudio.stopPlayback();
  };

  const handleIncomingMessage = async (
    message: Hume.empathicVoice.SubscribeEvent
  ) => {
    switch (message.type) {
      case "error":
        console.error(message);
        break;
      case "chat_metadata":
        // Contains useful information:
        // - chat_id: a unique identifier for the chat session, useful if you want to retrieve transcripts later
        // - chat_group_id: passing a "chat group" allows you to preserve context and resume the same conversation with EVI
        //     in a new websocket connection, e.g. after a disconnection.
        console.log("Received chat metadata:", message);
        break;
      case "audio_output":
        audioQueue.add(() => NativeAudio.playAudio(message.data));
        break;
      case "user_message":
      case "assistant_message":
        if (
          message.message.role !== "user" &&
          message.message.role !== "assistant"
        ) {
          console.error(
            `Unhandled: received message with role: ${message.message.role}`
          );
          return;
        }
        if (message.type === "user_message") {
          handleInterruption();
        }
        addChatEntry({
          role: message.message.role,
          timestamp: new Date().toString(),
          content: message.message.content!,
        });
        break;
      case "user_interruption":
        handleInterruption();
        break;

      // This message type indicate the end of EVI's "turn" in the conversation. They are not
      // needed in this example, however they could be useful in an audio environment that didn't have
      // good echo cancellation, so that you could auto-mute the user's microphone while EVI was
      // speaking.
      case "assistant_end":

      // These messages are not needed in this example. There are for EVI's "tool use" feature:
      // https://dev.hume.ai/docs/empathic-voice-interface-evi/tool-use
      case "tool_call":
      case "tool_error":
      case "tool_response":
        console.log(`Received unhandled message type: ${message.type}`);
        break;
      default:
        console.error(`Unexpected message`);
        console.error(message);
        break;
    }
  };

  return (
    <View style={styles.appBackground}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>
            You are {isConnected ? "connected" : "disconnected"}
          </Text>
        </View>
        <ScrollView style={styles.chatDisplay} ref={scrollViewRef}>
          {chatEntries.map((entry, index) => (
            <View
              key={index}
              style={[
                styles.chatEntry,
                entry.role === "user"
                  ? styles.userChatEntry
                  : styles.assistantChatEntry,
              ]}
            >
              <Text style={styles.chatText}>{entry.content}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.buttonContainer}>
          <Button
            title={isConnected ? "Disconnect" : "Connect"}
            onPress={() => setIsConnected(!isConnected)}
          />
          <Button
            title={isMuted ? "Unmute" : "Mute"}
            onPress={() => setIsMuted(!isMuted)}
          />
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  appBackground: {
    flex: 1,
    backgroundColor: "rgb(255, 244, 232)",
    alignItems: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
    maxWidth: 600,
    width: "100%",
  },
  header: {
    marginBottom: 16,
    alignItems: "center",
  },
  headerText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  chatDisplay: {
    flex: 1,
    width: "100%",
    marginBottom: 16,
  },
  chatEntry: {
    padding: 10,
    marginVertical: 5,
    borderRadius: 15,
    maxWidth: "75%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  userChatEntry: {
    backgroundColor: "rgb(209, 226, 243)",
    alignSelf: "flex-end",
    marginRight: 10,
  },
  assistantChatEntry: {
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    marginLeft: 10,
  },
  chatText: {
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});

export default App;
