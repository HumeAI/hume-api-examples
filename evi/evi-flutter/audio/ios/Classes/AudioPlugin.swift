import AVFoundation
import Flutter
import UIKit

public class AudioPlugin: NSObject, FlutterPlugin {
    private lazy var microphone: Microphone = {
        return Microphone()
    }()
    private var soundPlayer: SoundPlayer

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

    public static func register(with registrar: FlutterPluginRegistrar) {
        let methodChannel = FlutterMethodChannel(
            name: "audio",
            binaryMessenger: registrar.messenger()
        )

        let eventChannel = FlutterEventChannel(
            name: "audio/events",
            binaryMessenger: registrar.messenger()
        )

        let instance = AudioPlugin()

        registrar.addMethodCallDelegate(instance, channel: methodChannel)

        eventChannel.setStreamHandler(instance)

        instance.eventChannel = eventChannel
    }

    override init() {
        self.soundPlayer = SoundPlayer()
        super.init()

        self.soundPlayer.onError { [weak self] error in
            guard let self = self else { return }
            guard let eventSink = self.eventSink else { return }

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

        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(
            .playAndRecord,
            mode: .voiceChat,
            options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP]
        )
        try audioSession.setActive(true)
        inittedAudioSession = true
    }
}

extension AudioPlugin: FlutterStreamHandler {
    public func onListen(
        withArguments arguments: Any?,
        eventSink events: @escaping FlutterEventSink
    ) -> FlutterError? {
        self.eventSink = events
        return nil
    }

    public func onCancel(withArguments arguments: Any?) -> FlutterError? {
        self.eventSink = nil
        return nil
    }
}