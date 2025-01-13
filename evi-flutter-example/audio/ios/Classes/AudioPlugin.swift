import AVFoundation
import Flutter
import UIKit

public class AudioPlugin: NSObject, FlutterPlugin {
    private var soundPlayer: SoundPlayer
    private var microphone: Microphone

    private var eventChannel: FlutterEventChannel?
    private var eventSink: FlutterEventSink?

    private func sendError(_ message: String) {
        DispatchQueue.main.async {
            self.eventSink?([
                "type": "error",
                "message": message,
            ])
        }
    }
    private func sendAudio(_ base64String: String) {
        DispatchQueue.main.async {
            self.eventSink?([
                "type": "audio",
                "data": base64String,
            ])
        }
    }

    // MARK: - Plugin Registration
    public static func register(with registrar: FlutterPluginRegistrar) {
        // 1) Create method channel
        let methodChannel = FlutterMethodChannel(
            name: "audio",
            binaryMessenger: registrar.messenger()
        )

        // 2) Create event channel
        let eventChannel = FlutterEventChannel(
            name: "audio/events",
            binaryMessenger: registrar.messenger()
        )

        // 3) Create an instance of AudioPlugin
        let instance = AudioPlugin()

        // 4) Set method call delegate
        registrar.addMethodCallDelegate(instance, channel: methodChannel)

        // 5) Set event channel’s stream handler to that same instance (but we need a small extension, see below)
        eventChannel.setStreamHandler(instance)

        // Store references if needed
        instance.eventChannel = eventChannel
    }

    // MARK: - Init
    override init() {
        // Initialize your microphone and soundPlayer
        self.microphone = Microphone()
        self.soundPlayer = SoundPlayer()

        super.init()

        // Hook up error handling from SoundPlayer
        // Because we’re in a class, use [weak self] capture to avoid retain cycles
        self.soundPlayer.onError { [weak self] error in
            guard let self = self else { return }
            guard let eventSink = self.eventSink else { return }

            // You might send a structured map to Dart
            switch error {
            case .invalidBase64String:
                sendError("Invalid base64 string")
            case .couldNotPlayAudio:
                sendError("Could not play audio")
            case .decodeError(let details):
                sendError(details)
            }
        }
    }

    public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "getPermissions":
            Task {
               await getPermissions()
            }
        case "startRecording":
            do {
                print("startRecording method received")
                try ensureInittedAudioSession()
                try microphone.startRecording(onBase64EncodedAudio: sendAudio)
                result(nil)
            } catch {
                result(
                    FlutterError(
                        code: "START_RECORDING_ERROR",
                        message: error.localizedDescription,
                        details: nil
                    )
                )
            }

        case "enqueueAudio":
            guard let base64String = call.arguments as? String else {
                result(
                    FlutterError(
                        code: "INVALID_ARGUMENTS",
                        message: "Expected base64 string",
                        details: nil
                    ))
                return
            }
            Task {
                do {
                    print("invoking soundPlayer.enqueueAudio")
                    try await soundPlayer.enqueueAudio(base64String)
                } catch {
                    sendError(error.localizedDescription)
                }
            }
            result(nil)

        case "stopPlayback":
            soundPlayer.stopPlayback()
            result(nil)

        case "stopRecording":
            microphone.stopRecording()
            result(nil)

        default:
            result(FlutterMethodNotImplemented)
        }
    }

    private func getPermissions() async -> Bool {
        let audioSession = AVAudioSession.sharedInstance()
        switch audioSession.recordPermission {
        case .granted:
            return true
        case .denied:
            return false
        case .undetermined:
            return await withCheckedContinuation { continuation in
                audioSession.requestRecordPermission { granted in
                    continuation.resume(returning: granted)
                }
            }
        @unknown default:
            sendError("Unknown permission state")
            return false
        }
    }

    private var inittedAudioSession = false
    private func ensureInittedAudioSession() throws {
        if inittedAudioSession { return }

        print("Initializing AVAudioSession...")
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(
            .playAndRecord,
            mode: .voiceChat,
            options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP]
        )
        try audioSession.setActive(true)
        print("Activated audio session")
        inittedAudioSession = true
    }
}

// MARK: - FlutterStreamHandler
extension AudioPlugin: FlutterStreamHandler {
    // Called when Dart side starts listening to "audio/events"
    public func onListen(
        withArguments arguments: Any?,
        eventSink events: @escaping FlutterEventSink
    ) -> FlutterError? {
        // Save the callback so we can send events
        self.eventSink = events
        return nil
    }

    // Called when Dart cancels listening
    public func onCancel(withArguments arguments: Any?) -> FlutterError? {
        self.eventSink = nil
        return nil
    }
}
