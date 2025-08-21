import AVFoundation
import ExpoModulesCore
import Foundation
import Hume

public class AudioModule: Module {
    private let audioHub = AudioHub.shared
    private var audioHubIsPrepared = false
    private var _soundPlayer: SoundPlayer?

    private func handleMicrophoneData(_ data: Data) {
        self.sendEvent("onAudioInput", ["base64EncodedAudio": data])
    }

    private func handleAudioOutput(_ audioOutput: AudioOutput) {
      guard let clip = SoundClip.from(audioOutput) else {
        self.sendEvent("onError", ["message": "Failed to decode audio output"])
        return
      } 
      Task {
        do {
          let soundPlayer = try await getSoundPlayer(format: AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: 48000,
            channels: 1,
            interleaved: false
          )!)
          await soundPlayer.enqueueAudio(soundClip: clip)
        } catch {
            self.sendEvent("onError", ["message": error.localizedDescription])
        }
      }
    }

    /// Gets an existing SoundPlayer with the specified format or creates a new one if necessary.
    private func getSoundPlayer(format: AVAudioFormat) async throws -> SoundPlayer {
      if let _soundPlayer {
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
            try await prepare()
            try await self.audioHub.startMicrophone(handler: handleMicrophoneData)

        }

        AsyncFunction("stopRecording") {
            try await prepare()
            try await self.audioHub.stopMicrophone()
        }

        AsyncFunction("mute") {
            audioHub.muteMic(true)
        }
        
        AsyncFunction("unmute") {
            audioHub.muteMic(false)
        }

        AsyncFunction("enqueueAudio") { (base64EncodedAudio: String) in
            try await ensureConfiguredAudioHub()
        }
        
        AsyncFunction("stopPlayback") {
            guard let audioHub = audioHub else { return }
        }
    }

    private func getPermissions() async throws -> Bool {
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
            throw NSError(
                domain: "AudioModule", code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Unknown permission state"])
        }
    }

    private func prepare() async throws {
        self.audioHub.prepare()
    }
}
