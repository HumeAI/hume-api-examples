import 'package:flutter_test/flutter_test.dart';
import 'package:audio/audio.dart';
import 'package:audio/audio_platform_interface.dart';
import 'package:audio/audio_method_channel.dart';
import 'package:plugin_platform_interface/plugin_platform_interface.dart';

class MockAudioPlatform
    with MockPlatformInterfaceMixin
    implements AudioPlatform {

  @override
  Future<String?> getPlatformVersion() => Future.value('42');
}

void main() {
  final AudioPlatform initialPlatform = AudioPlatform.instance;

  test('$MethodChannelAudio is the default instance', () {
    expect(initialPlatform, isInstanceOf<MethodChannelAudio>());
  });

  test('getPlatformVersion', () async {
    Audio audioPlugin = Audio();
    MockAudioPlatform fakePlatform = MockAudioPlatform();
    AudioPlatform.instance = fakePlatform;

    expect(await audioPlugin.getPlatformVersion(), '42');
  });
}
