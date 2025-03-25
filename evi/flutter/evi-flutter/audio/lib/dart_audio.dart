import 'dart:async';
import 'dart:convert';

import 'package:audioplayers/audioplayers.dart';
import 'package:record/record.dart';

class DartAudio {
  // Playback stuff
  final AudioPlayer _audioPlayer = AudioPlayer();
  final List<Source> _playbackAudioQueue = [];

  // Recording stuff
  final AudioRecorder _recorder = AudioRecorder();
  final config = const RecordConfig(
    encoder: AudioEncoder.pcm16bits,
    bitRate: 48000 *
        2 *
        16, // 48000 samples per second * 2 channels (stereo) * 16 bits per sample
    sampleRate: 48000,
    numChannels: 1,
    autoGain: true,
    echoCancel: true,
    noiseSuppress: true,
  );
  bool _isMuted = false;
  bool _isRecording = false;
  StreamSubscription<List<int>>? _recordSubscription;

  DartAudio() {
    final AudioContext audioContext = AudioContext(
      android: const AudioContextAndroid(
        isSpeakerphoneOn: false,
        audioMode: AndroidAudioMode.normal,
        stayAwake: false,
        contentType: AndroidContentType.speech,
        usageType: AndroidUsageType.voiceCommunication,
        audioFocus: AndroidAudioFocus.gain,
      ),
    );
    AudioPlayer.global.setAudioContext(audioContext);

    _audioPlayer.onPlayerComplete.listen((event) {
      _playNextAudioSegment();
    });
  }

  // -------------------------
  // Playback fallback
  // -------------------------
  void enqueueAudioSegment(String base64Bytes) {
    final audioSegment = BytesSource(base64Decode(base64Bytes));
    if (_audioPlayer.state == PlayerState.playing) {
      _playbackAudioQueue.add(audioSegment);
    } else {
      _audioPlayer.play(audioSegment);
    }
  }

  void stopPlayback() {
    _playbackAudioQueue.clear();
    _audioPlayer.stop();
  }

  void _playNextAudioSegment() {
    if (_playbackAudioQueue.isNotEmpty) {
      final audioSegment = _playbackAudioQueue.removeAt(0);
      _audioPlayer.play(audioSegment);
    }
  }

  // ----------------------------------------------------------------
  // (A) Recording fallback: returning a Stream of chunked bytes
  // ----------------------------------------------------------------
  /// Starts recording, returning a stream of byte chunks. 
  /// You can specify the config (sampleRate, bitRate, etc.) and a 
  /// "chunkSize" in bytes. Each chunk of raw audio is emitted in the stream.
  Future<Stream<List<int>>> startRecording() async {
    if (_isRecording) {
      throw Exception('Already recording');
    }
    // Request mic permission
    if (!await _recorder.hasPermission()) {
      throw Exception('No mic permission');
    }

    // We'll create a StreamController to push chunked data
    final controller = StreamController<List<int>>();


    // Start streaming from the record package
    final recordStream = await _recorder.startStream(config);

    _isRecording = true;
    _isMuted = false;
    final audioInputBuffer = <int>[];

    // Calculate chunk size in bytes, e.g., config.bitRate / 10 for ~100ms
    final chunkSize = config.bitRate ~/ 10; 

    _recordSubscription = recordStream.listen(
      (data) {
        if (!_isMuted) {
          // If not muted, we add the new data
          audioInputBuffer.addAll(data);

          if (audioInputBuffer.length >= chunkSize) {
            // If the entire chunk is silent, ignore it if you want
            final bufferWasEmpty = audioInputBuffer.every((byte) => byte == 0);
            if (!bufferWasEmpty) {
              // Emit this chunk to the stream
              controller.add(List<int>.from(audioInputBuffer));
            }
            audioInputBuffer.clear();
          }
        } else {
          // If muted, optionally do nothing or emit zeros, etc.
        }
      },
      onError: (err) => controller.addError(err),
      onDone: () {
        _isRecording = false;
        controller.close();
      },
    );

    return controller.stream;
  }

  Future<void> stopRecording() async {
    if (_isRecording) {
      await _recordSubscription?.cancel();
      _recordSubscription = null;
      await _recorder.stop();
      _isRecording = false;
      _isMuted = false;
    }
  }

  Future<void> mute() async {
    _isMuted = true;
  }

  Future<void> unmute() async {
    _isMuted = false;
  }

  // If you want a simpler "just record to a file," 
  // you could do it in separate methods. But this is 
  // a chunked streaming approach, same as your original code.

  // ----------------------------------------------------------------
  // Cleanup
  // ----------------------------------------------------------------
  Future<void> dispose() async {
    await _audioPlayer.dispose();
    await stopRecording(); // stop + unsub
  }
}
