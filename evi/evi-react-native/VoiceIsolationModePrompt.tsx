import React from 'react';
import {
  View,
  Text,
  Button,
  Linking,
  Platform,
  Modal,
} from 'react-native';
import NativeAudio from './modules/audio';

interface VoiceIsolationModePromptProps {
  isVisible: boolean;
  currentMode: string;
  onDismiss: () => void;
}

const VoiceIsolationModePrompt: React.FC<VoiceIsolationModePromptProps> = ({
  isVisible,
  currentMode,
  onDismiss,
}) => {
  const handleOpenSettings = async () => {
    if (Platform.OS === 'ios') {
      try {
        await NativeAudio.showMicrophoneModes();
      } catch (error) {
        // Fallback to general settings if the API is not available
        Linking.openSettings();
      }
    } else {
      Linking.openSettings();
    }
    onDismiss();
  };

  const handleShowMeHow = () => {
    const supportUrl = 'https://support.apple.com/en-us/101993';
    Linking.openURL(supportUrl);
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }}>
        <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, width: '90%' }}>
          <Text>Enable voice isolation for the best experience</Text>

          <Text>
            Your device is currently using a {currentMode} microphone mode.
            Enabling voice isolation will provide the best audio experience
            in a noisy setting.
          </Text>

          <Button title="Open settings" onPress={handleOpenSettings} />
          <Button title="Show me how" onPress={handleShowMeHow} />
          <Button title="I'll do this later" onPress={onDismiss} />
        </View>
      </View>
    </Modal>
  );
};

export default VoiceIsolationModePrompt;
