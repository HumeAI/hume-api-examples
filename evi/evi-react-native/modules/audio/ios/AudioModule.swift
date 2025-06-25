import AVFoundation
import ExpoModulesCore
import Foundation
import Hume

public class AudioModule: Module {
    private var audioHub: AudioHub!

    public func definition() -> ModuleDefinition {
        Name("Audio")

        Constants(["sampleRate": 48000, "isLinear16PCM": true])

        Events("onAudioInput", "onError")

        AsyncFunction("getPermissions") {
            return try await self.getPermissions()
        }

        AsyncFunction("startRecording") {
            try await ensureConfiguredAudioHub()

            audioHub.microphoneDataChunkHandler = { [weak self] data, averagePower in
                let base64String = data.base64EncodedString()
                Task { @MainActor in
                    self?.sendEvent("onAudioInput", ["base64EncodedAudio": base64String])
                }
            }
        
            try await self.audioHub.start()
        }

        AsyncFunction("stopRecording") {
            try await ensureConfiguredAudioHub()
            try await self.audioHub.stop()
        }

        AsyncFunction("mute") {
            guard let audioHub = audioHub else { return }
            audioHub.muteMic(true)
        }
        
        AsyncFunction("unmute") {
            guard let audioHub = audioHub else { return }
            audioHub.muteMic(false)
        }

        AsyncFunction("enqueueAudio") { (base64EncodedAudio: String) in
            try await ensureConfiguredAudioHub()
            
            // Create a mock AudioOutput to convert to SoundClip
            let audioOutput = AudioOutput(
                customSessionId: nil,
                data: base64EncodedAudio,
                index: 0,
                id: UUID().uuidString,
                type: "audio_output"
            )
            
            guard let soundClip = SoundClip.from(audioOutput) else {
                throw NSError(domain: "AudioModule", code: 2, 
                             userInfo: [NSLocalizedDescriptionKey: "Failed to create sound clip"])
            }
            
            self.audioHub.enqueue(soundClip: soundClip)
        }
        
        AsyncFunction("stopPlayback") {
            guard let audioHub = audioHub else { return }
            audioHub.handleInterruption()
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

    private func ensureConfiguredAudioHub() async throws {
        if audioHub != nil || audioHub.state != .unconfigured {
            return
        }
        
        audioHub = Hume.AudioHubImpl()

        try await audioHub.configure()
        isConfigured = true
    }
}
