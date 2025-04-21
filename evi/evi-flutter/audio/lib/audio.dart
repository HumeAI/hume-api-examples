import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/services.dart';
import 'package:audio/dart_audio.dart';

class Audio {
  static final Audio _instance = Audio._internal();
  factory Audio() => _instance;

  static const MethodChannel channel = MethodChannel('audio');
  static const EventChannel _eventChannel = EventChannel('audio/events');

  DartAudio? _dartAudio;

  Audio._internal() {
    if (kIsWeb || !Platform.isIOS) {
      _dartAudio = DartAudio();
    } else {
      _eventChannel.receiveBroadcastStream().listen(
        (event) {
          if (event is Map) {
            if (event['type'] == 'audio') {
              final audioData = event['data'] as String;
              _audioController.add(audioData);
            } else if (event['type'] == 'error') {
              final error = event['message'] as String;
              _audioController.addError(error);
            }
          }
        },
        onError: (error) {
          _audioController.addError(error);
        },
      );
    }
  }

  final _audioController = StreamController<String>.broadcast();
  Stream<String> get audioStream => _audioController.stream;

  Future<void> startRecording() async {
    if (_dartAudio != null) {
      (await _dartAudio!.startRecording()).listen(
        (data) {
          _audioController.add(base64Encode(data));
        },
        onError: (error) {
          _audioController.addError(error);
        },
      );
    } else {
      try {
        await channel.invokeMethod('startRecording');
      } catch (error) {
        _audioController.addError(error);
      }
    }
  }

  Future<void> stopRecording() async {
    if (_dartAudio != null) {
      _dartAudio!.stopRecording();
    } else {
      return channel.invokeMethod('stopRecording');
    }
  }

  Future<void> mute() async {
    if (_dartAudio != null) {
      _dartAudio!.mute();
    } else {
      return await channel.invokeMethod('mute');
    }
  }

  Future<void> unmute() async {
    if (_dartAudio != null) {
      _dartAudio!.unmute();
    } else {
      return await channel.invokeMethod('unmute');
    }
  }

  Future<void> enqueueAudio(String base64String) async {
    if (_dartAudio != null) {
      _dartAudio!.enqueueAudioSegment(base64String);
    } else {
      print("Invoking enqueueAudio");
      return channel.invokeMethod('enqueueAudio', base64String);
    }
  }

  Future<void> stopPlayback() async {
    if (_dartAudio != null) {
      _dartAudio!.stopPlayback();
    } else {
      await channel.invokeMethod('stopPlayback');
    }
  }

  Future<void> dispose() async {
    _audioController.close();
    await _dartAudio?.dispose();
  }
}
