import 'dart:convert';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:record/record.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'theme.dart';
import 'chat_card.dart';
import 'evi_message.dart' as evi;

class ConfigManager {
  static final ConfigManager _instance = ConfigManager._internal();

  String humeApiKey = "";
  String humeAccessToken = "";
  late final String humeConfigId;

  ConfigManager._internal();

  static ConfigManager get instance => _instance;

  // WARNING! For development only. In production, the app should hit your own backend server to get an access token, using "token authentication" (see https://dev.hume.ai/docs/introduction/api-key#token-authentication)
  String fetchHumeApiKey() {
    return dotenv.env['HUME_API_KEY'] ?? "";
  }

  Future<String> fetchAccessToken() async {
    // Make a get request to dotenv.env['MY_SERVER_URL'] to get the access token
    final authUrl = dotenv.env['MY_SERVER_AUTH_URL'];
    if (authUrl == null) {
      throw Exception('Please set MY_SERVER_AUTH_URL in your .env file');
    }
    final url = Uri.parse(authUrl);
    final response = await http.get(url);
    if (response.statusCode == 200) {
      return jsonDecode(response.body)['access_token'];
    } else {
      throw Exception('Failed to load access token');
    }
  }

  Future<void> loadConfig() async {
    // Make sure to create a .env file in your root directory which mirrors the .env.example file
    // and add your API key and an optional EVI config ID.
    await dotenv.load();

    // WARNING! For development only.
    humeApiKey = fetchHumeApiKey();

    // Uncomment this to use an access token in production.
    // humeAccessToken = await fetchAccessToken();
    humeConfigId = dotenv.env['HUME_CONFIG_ID'] ?? '';
  }
}

void main() async {
  // Ensure Flutter binding is initialized before calling asynchronous operations
  WidgetsFlutterBinding.ensureInitialized();

  // Load config in singleton
  await ConfigManager.instance.loadConfig();

  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    if (ConfigManager.instance.humeApiKey.isEmpty &&
        ConfigManager.instance.humeAccessToken.isEmpty) {
      return MaterialApp(
          title: 'Flutter with EVI',
          home: ErrorMessage(
            message:
                "Error: Please set your Hume API key in main.dart (or use fetchAccessToken)",
          ),
          theme: appTheme);
    }
    return MaterialApp(
      title: 'Flutter with EVI',
      home: MyHomePage(title: 'Flutter with EVI'),
      theme: appTheme,
    );
  }

  static List<Score> extractTopThreeEmotions(evi.Inference models) {
    // extract emotion scores from the message
    final scores = models.prosody?.scores ?? {};

    // convert the emotions object into an array of key-value pairs
    final scoresArray = scores.entries.toList();

    // sort the array by the values in descending order
    scoresArray.sort((a, b) => b.value.compareTo(a.value));

    // extract the top three emotions and convert them back to an object
    final topThreeEmotions = scoresArray.take(3).map((entry) {
      return Score(emotion: entry.key, score: entry.value);
    }).toList();

    return topThreeEmotions;
  }
}

class ErrorMessage extends StatelessWidget {
  final String message;

  const ErrorMessage({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        message,
        style: Theme.of(context).textTheme.headlineLarge,
      ),
    );
  }
}

class MyHomePage extends StatefulWidget {
  final String title;

  const MyHomePage({super.key, required this.title});

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  // define config here for recorder
  static const config = RecordConfig(
    encoder: AudioEncoder.pcm16bits,
    bitRate: 48000 *
        2 *
        16, // 44100 samples per second * 2 channels (stereo) * 16 bits per sample
    sampleRate: 48000,
    numChannels: 1,
    autoGain: true,
    echoCancel: true,
    noiseSuppress: true,
  );
  static final audioInputBufferSize = config.bitRate ~/
      10; // bitrate is "number of bits per second". Dividing by 10 should buffer approximately 100ms of audio at a time.

  final AudioPlayer _audioPlayer = AudioPlayer();
  final AudioRecorder _audioRecorder = AudioRecorder();
  WebSocketChannel? _chatChannel;
  bool _isConnected = false;
  bool _isMuted = false;
  var messages = <ChatEntry>[];

  // As EVI speaks, it will send audio segments to be played back. Sometimes a new segment
  // will arrive before the old audio segment has had a chance to finish playing, so -- instead
  // of directly playing an audio segment as it comes back, we queue them up here.
  final List<Source> _playbackAudioQueue = [];

  // Holds bytes of audio recorded from the user's microphone.
  List<int> _audioInputBuffer = <int>[];

  // EVI sends back transcripts of both the user's speech and the assistants speech, along
  // with an analysis of the emotional content of the speech. This method takes
  // of a message from EVI, parses it into a `ChatMessage` type and adds it to `messages` so
  // it can be displayed.
  void appendNewChatMessage(evi.ChatMessage chatMessage, evi.Inference models) {
    final role = chatMessage.role == 'assistant' ? Role.assistant : Role.user;
    final message = ChatEntry(
        role: role,
        timestamp: DateTime.now().toString(),
        content: chatMessage.content,
        scores: MyApp.extractTopThreeEmotions(models));
    setState(() {
      messages.add(message);
    });
  }

  @override
  Widget build(BuildContext context) {
    final muteButton = _isMuted
        ? ElevatedButton(
            onPressed: _unmuteInput,
            child: const Text('Unmute'),
          )
        : ElevatedButton(
            onPressed: _muteInput,
            child: const Text('Mute'),
          );
    final connectButton = _isConnected
        ? ElevatedButton(
            onPressed: _disconnect,
            child: const Text('Disconnect'),
          )
        : ElevatedButton(
            onPressed: _connect,
            child: const Text('Connect'),
          );
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: Center(
          child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: 600),
              child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: <Widget>[
                    Text(
                      'You are ${_isConnected ? 'connected' : 'disconnected'}',
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    Expanded(child: ChatDisplay(messages: messages)),
                    Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: <Widget>[connectButton, muteButton]))
                  ]))),
    );
  }

  @override
  void dispose() {
    _audioPlayer.dispose();
    _audioRecorder.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    final AudioContext audioContext = AudioContext(
      iOS: AudioContextIOS(
        category: AVAudioSessionCategory.playAndRecord,
        options: const {
          AVAudioSessionOptions.defaultToSpeaker,
        },
      ),
      android: AudioContextAndroid(
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

  // Opens a websocket connection to the EVI API and registers a listener to handle
  // incoming messages.
  void _connect() {
    setState(() {
      _isConnected = true;
    });
    if (ConfigManager.instance.humeApiKey.isNotEmpty &&
        ConfigManager.instance.humeAccessToken.isNotEmpty) {
      throw Exception(
          'Please use either an API key or an access token, not both');
    }

    var uri = 'wss://api.hume.ai/v0/evi/chat';
    if (ConfigManager.instance.humeAccessToken.isNotEmpty) {
      uri += '?access_token=${ConfigManager.instance.humeAccessToken}';
    } else if (ConfigManager.instance.humeApiKey.isNotEmpty) {
      uri += '?api_key=${ConfigManager.instance.humeApiKey}';
    } else {
      throw Exception('Please set your Hume API credentials in main.dart');
    }

    _chatChannel = WebSocketChannel.connect(Uri.parse(uri));

    _chatChannel!.stream.listen(
      (event) async {
        final message = evi.EviMessage.decode(event);
        debugPrint("Received message: ${message.type}");
        // This message contains audio data for playback.
        switch (message) {
          case (evi.ErrorMessage errorMessage):
            debugPrint("Error: ${errorMessage.message}");
            break;
          case (evi.ChatMetadataMessage chatMetadataMessage):
            debugPrint("Chat metadata: ${chatMetadataMessage.rawJson}");
            _prepareAudioSettings();
            _startRecording();
            break;
          case (evi.AudioOutputMessage audioOutputMessage):
            final data = audioOutputMessage.data;
            final rawAudio = base64Decode(data);
            Source source;
            if (!kIsWeb) {
              source = _urlSourceFromBytes(rawAudio);
            } else {
              source = BytesSource(rawAudio);
            }

            _enqueueAudioSegment(source);
            break;
          case (evi.UserInterruptionMessage _):
            _handleInterruption();
            break;
          // These messages contain the transcript text of the user's or the assistant's speech
          // as well as emotional analysis of the speech.
          case (evi.AssistantMessage assistantMessage):
            appendNewChatMessage(
                assistantMessage.message, assistantMessage.models);
            break;
          case (evi.UserMessage userMessage):
            appendNewChatMessage(userMessage.message, userMessage.models);
            _handleInterruption();
            break;
          case (evi.UnknownMessage unknownMessage):
            debugPrint("Unknown message: ${unknownMessage.rawJson}");
            break;
        }
      },
      onError: (error) {
        debugPrint("Connection error: $error");
        _handleConnectionClosed();
      },
      onDone: () {
        debugPrint("Connection closed");
        _handleConnectionClosed();
      },
    );

    debugPrint("Connected");
  }

  void _disconnect() {
    _handleConnectionClosed();
    _handleInterruption();
    _chatChannel?.sink.close();
    debugPrint("Disconnected");
  }

  void _enqueueAudioSegment(Source audioSegment) {
    debugPrint("Enqueueing audio segment");
    if (!_isConnected) {
      return;
    }
    if (_audioPlayer.state == PlayerState.playing) {
      _playbackAudioQueue.add(audioSegment);
    } else {
      _audioPlayer.play(audioSegment);
    }
  }

  void _flushAudio() {
    if (_audioInputBuffer.isNotEmpty) {
      _sendAudio(_audioInputBuffer);
      _audioInputBuffer.clear();
    }
  }

  void _handleConnectionClosed() {
    setState(() {
      _isConnected = false;
    });
    _audioInputBuffer.clear();
    _stopRecording();
  }

  void _handleInterruption() {
    _playbackAudioQueue.clear();
    _audioPlayer.stop();
  }

  void _muteInput() {
    _stopRecording();
    setState(() {
      _isMuted = true;
    });
    // When the user hits mute, we should send any audio that's in the buffer
    // waiting to be sent. Otherwise, for example, if you are sending audio in
    // 100ms chunks, and the user says something and immediately hits mute, the
    // last 99ms of audio might not get sent.
    _flushAudio();
  }

  void _playNextAudioSegment() {
    if (_playbackAudioQueue.isNotEmpty) {
      final audioSegment = _playbackAudioQueue.removeAt(0);
      _audioPlayer.play(audioSegment);
    }
  }

  void _prepareAudioSettings() {
    // set session settings to prepare EVI for receiving linear16 encoded audio
    // https://dev.hume.ai/docs/empathic-voice-interface-evi/configuration#session-settings
    _chatChannel!.sink.add(jsonEncode({
      'type': 'session_settings',
      'audio': {
        'encoding': 'linear16',
        'sample_rate': 48000,
        'channels': 1,
      },
    }));
  }

  void _sendAudio(List<int> audioBytes) {
    final base64 = base64Encode(audioBytes);
    _chatChannel!.sink.add(jsonEncode({
      'type': 'audio_input',
      'data': base64,
    }));
  }

  void _startRecording() async {
    if (!await _audioRecorder.hasPermission()) {
      return;
    }
    final audioStream = await _audioRecorder.startStream(config);

    audioStream.listen((data) async {
      _audioInputBuffer.addAll(data);

      if (_audioInputBuffer.length >= audioInputBufferSize) {
        final bufferWasEmpty =
            !_audioInputBuffer.any((element) => element != 0);
        if (bufferWasEmpty) {
          _audioInputBuffer = [];
          return;
        }
        _sendAudio(_audioInputBuffer);
        _audioInputBuffer = [];
      }
    });
    audioStream.handleError((error) {
      debugPrint("Error recording audio: $error");
    });
  }

  void _stopRecording() {
    _audioRecorder.stop();
  }

  void _unmuteInput() {
    _startRecording();
    setState(() {
      _isMuted = false;
    });
  }

  // In the `audioplayers` library, iOS does not support playing audio from a `ByteSource` but
  // we can use a `UrlSource` with a data URL.
  UrlSource _urlSourceFromBytes(List<int> bytes,
      {String mimeType = "audio/wav"}) {
    return UrlSource(Uri.dataFromBytes(bytes, mimeType: mimeType).toString());
  }
}
