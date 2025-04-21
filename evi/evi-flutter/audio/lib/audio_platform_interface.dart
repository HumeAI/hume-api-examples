import 'package:plugin_platform_interface/plugin_platform_interface.dart';

import 'audio_method_channel.dart';

abstract class AudioPlatform extends PlatformInterface {
  /// Constructs a AudioPlatform.
  AudioPlatform() : super(token: _token);

  static final Object _token = Object();

  static AudioPlatform _instance = MethodChannelAudio();

  /// The default instance of [AudioPlatform] to use.
  ///
  /// Defaults to [MethodChannelAudio].
  static AudioPlatform get instance => _instance;

  /// Platform-specific implementations should set this with their own
  /// platform-specific class that extends [AudioPlatform] when
  /// they register themselves.
  static set instance(AudioPlatform instance) {
    PlatformInterface.verifyToken(instance, _token);
    _instance = instance;
  }

  Future<String?> getPlatformVersion() {
    throw UnimplementedError('platformVersion() has not been implemented.');
  }
}
