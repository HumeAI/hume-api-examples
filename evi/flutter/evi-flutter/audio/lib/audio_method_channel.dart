import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'audio_platform_interface.dart';

/// An implementation of [AudioPlatform] that uses method channels.
class MethodChannelAudio extends AudioPlatform {
  /// The method channel used to interact with the native platform.
  @visibleForTesting
  final methodChannel = const MethodChannel('audio');

  @override
  Future<String?> getPlatformVersion() async {
    final version = await methodChannel.invokeMethod<String>('getPlatformVersion');
    return version;
  }
}
