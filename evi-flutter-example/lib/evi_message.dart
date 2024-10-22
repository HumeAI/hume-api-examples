import 'dart:convert';

sealed class EviMessage {
  final String type;
  final Map<String, dynamic> rawJson;

  EviMessage._(this.type, this.rawJson);

  factory EviMessage.decode(String text) {
    final json = jsonDecode(text) as Map<String, dynamic>;
    final type = json['type'] as String;
    switch (type) {
      case 'error':
        return EviErrorMessage(json);
      case 'chat_metadata':
        return ChatMetadataMessage(json);
      case 'audio_output':
        return AudioOutputMessage(json['data'] as String, json);
      case 'user_interruption':
        return UserInterruptionMessage(json);
      case 'assistant_message':
        return AssistantMessage(json);
      case 'user_message':
        return UserMessage(json);
      default:
        return UnknownMessage(json);
    }
  }
}

class EviErrorMessage extends EviMessage {
  EviErrorMessage(json) : super._('chat_metadata', json);
}

class ChatMetadataMessage extends EviMessage {
  ChatMetadataMessage(json) : super._('chat_metadata', json);
}

class AudioOutputMessage extends EviMessage {
  final String data;
  AudioOutputMessage(this.data, json) : super._('audio_output', json);
}

class UserInterruptionMessage extends EviMessage {
  UserInterruptionMessage(json) : super._('user_interruption', json);
}

class AssistantMessage extends EviMessage {
  AssistantMessage(json) : super._('assistant_message', json);
}

class UserMessage extends EviMessage {
  UserMessage(json) : super._('user_message', json);
}

class UnknownMessage extends EviMessage {
  UnknownMessage(json) : super._(json['type'], json);
}
