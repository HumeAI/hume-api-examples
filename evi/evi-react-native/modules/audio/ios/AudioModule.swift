import AVFoundation
import ExpoModulesCore
import Foundation
import Hume

public class AudioModule: Module {
    private let audioHub = AudioHub.shared
    private var audioHubIsPrepared = false
    private var _soundPlayer: SoundPlayer?
    
    private static let audioFormat = AVAudioFormat(
        commonFormat: .pcmFormatInt16,
        sampleRate: 48000,
        channels: 1,
        interleaved: false
    )!

    private func handleMicrophoneData(_ data: Data, _: Float) {
        self.sendEvent("onAudioInput", ["base64EncodedAudio": data.base64EncodedString()])
    }

    private func handleAudioOutput(_ audioOutput: AudioOutput) {
      guard let clip = SoundClip.from(audioOutput) else {
        self.sendEvent("onError", ["message": "Failed to decode audio output"])
        return
      }
      playAudioClip(clip)
    }
    
    private func playAudioClip(_ clip: SoundClip) {
      Task {
        do {
          let soundPlayer = try await getSoundPlayer(format: Self.audioFormat)
          await soundPlayer.enqueueAudio(soundClip: clip)
        } catch {
            self.sendEvent("onError", ["message": error.localizedDescription])
        }
      }
    }

    private func getSoundPlayer(format: AVAudioFormat) async throws -> SoundPlayer {
      if let _soundPlayer {
        // TODO: if the format changes, it will not be reflected.
        return _soundPlayer
      } else {
          _soundPlayer = SoundPlayer(format: format)
      }
      try await audioHub.addNode(_soundPlayer!.audioSourceNode, format: format)
      return _soundPlayer!
    }

    public func definition() -> ModuleDefinition {
        Name("Audio")

        Constants(["sampleRate": 48000, "isLinear16PCM": true])

        Events("onAudioInput", "onError")

        AsyncFunction("getPermissions") {
            return try await self.getPermissions()
        }

        AsyncFunction("startRecording") {
            // Ensure permissions are granted first
            let hasPermission = try await self.getPermissions()
            guard hasPermission else {
                throw NSError(domain: "AudioModule", code: 2, userInfo: [NSLocalizedDescriptionKey: "Microphone permission not granted"])
            }
            try await prepare()
            try await self.audioHub.startMicrophone(handler: handleMicrophoneData)
        }

        AsyncFunction("stopRecording") {
            try await prepare()
            await self.audioHub.stopMicrophone()
        }

        AsyncFunction("mute") {
            await audioHub.muteMic(true)
        }
        
        AsyncFunction("unmute") {
            await audioHub.muteMic(false)
        }

        AsyncFunction("enqueueAudio") { (base64EncodedAudio: String) in
            try await prepare()
            guard let audioData = Data(base64Encoded: base64EncodedAudio) else {
                self.sendEvent("onError", ["message": "Invalid base64 audio data"])
                return
            }
            guard let clip = SoundClip.from(audioData) else {
                self.sendEvent("onError", ["message": "Failed to create sound clip"])
                return
            }
            self.playAudioClip(clip)
        }
        
        AsyncFunction("stopPlayback") {
            await _soundPlayer?.clearQueue()
        }
    }

    private func getPermissions() async throws -> Bool {
        let audioSession = AVAudioSession.sharedInstance()
        print("AudioModule: Current permission state: \(audioSession.recordPermission.rawValue)")
        switch audioSession.recordPermission {
        case .granted:
            print("AudioModule: Microphone permission already granted")
            return true
        case .denied:
            print("AudioModule: Microphone permission denied")
            return false
        case .undetermined:
            print("AudioModule: Requesting microphone permission...")
            return await withCheckedContinuation { continuation in
                audioSession.requestRecordPermission { granted in
                    print("AudioModule: Permission request result: \(granted)")
                    continuation.resume(returning: granted)
                }
            }
        @unknown default:
            throw NSError(
                domain: "AudioModule", code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Unknown permission state"])
        }
    }

    private func prepare() async throws {
        guard !audioHubIsPrepared else { return }
        print("AudioModule: Preparing AudioHub...")
        await self.audioHub.prepare()
        audioHubIsPrepared = true
        print("AudioModule: AudioHub prepared successfully")
    }
}
