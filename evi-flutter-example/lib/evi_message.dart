import 'dart:convert';

// Represents an incoming message sent from the /v0/evi/chat websocket endpoint of
// the Hume API. This example includes only messages and properties that are used in the example.
// You should add more messages and properties to this datatype as needed.
// See https://hume.docs.buildwithfern.com/reference/empathic-voice-interface-evi/chat/chat#receive
// for the full list of messages and their properties.
//
// You can also use the Typescript SDK as a useful reference:
// https://github.com/HumeAI/hume-typescript-sdk/blob/da8820dfef2a30e0745a6ae86987b090a5ba0e6e/src/api/resources/empathicVoice/types/JsonMessage.ts#L7
sealed class EviMessage {
  final String type;
  final Map<String, dynamic> rawJson;

  EviMessage._(this.type, this.rawJson);

  factory EviMessage.decode(String text) {
    final json = jsonDecode(text) as Map<String, dynamic>;
    final type = json['type'] as String;
    switch (type) {
      case 'error':
        return ErrorMessage(json);
      case 'chat_metadata':
        return ChatMetadataMessage(json);
      case 'audio_output':
        return AudioOutputMessage(json);
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

class ErrorMessage extends EviMessage {
  final String message;
  ErrorMessage(json)
      : message = json['message'],
        super._('chat_metadata', json);
}

class ChatMetadataMessage extends EviMessage {
  ChatMetadataMessage(json) : super._('chat_metadata', json);
}

class AudioOutputMessage extends EviMessage {
  final String data;
  AudioOutputMessage(json)
      : data = json['data'],
        super._('audio_output', json);
}

class UserInterruptionMessage extends EviMessage {
  UserInterruptionMessage(json) : super._('user_interruption', json);
}

class ChatMessage {
  final String role;
  final String content;
  ChatMessage(json)
      : role = json['role'],
        content = json['content'];
}

class ProsodyInference {
  final Map<String, double> scores;
  ProsodyInference(json) : scores = json['scores'].cast<String, double>();
}

class Inference {
  final ProsodyInference? prosody;
  Inference(json) : prosody = ProsodyInference(json['prosody']);
}

class AssistantMessage extends EviMessage {
  final ChatMessage message;
  final Inference models;
  AssistantMessage(json)
      : message = ChatMessage(json['message']),
        models = Inference(json['models']),
        super._('assistant_message', json);
}

class UserMessage extends EviMessage {
  final ChatMessage message;
  final Inference models;
  UserMessage(json)
      : message = ChatMessage(json['message']),
        models = Inference(json['models']),
        super._('user_message', json);
}

class UnknownMessage extends EviMessage {
  UnknownMessage(json) : super._(json['type'], json);
}
