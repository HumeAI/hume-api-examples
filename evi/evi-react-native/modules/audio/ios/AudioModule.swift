import AVFoundation
import ExpoModulesCore
import Foundation
import Hume

public class AudioModule: Module {
    private var voiceProvider: VoiceProvider!
    private var isConfigured = false

    public func definition() -> ModuleDefinition {
        Name("Audio")

        Constants(["sampleRate": 48000, "isLinear16PCM": true])

        Events("onAudioInput", "onError")

        AsyncFunction("getPermissions") {
            return try await self.getPermissions()
        }

        AsyncFunction("startRecording") {
            try await ensureConfiguredVoiceProvider()

            // VoiceProvider manages audio internally
            // For now, we'll implement a basic recording pattern
            // The actual microphone data handling would be done through VoiceProvider delegates
        }

        AsyncFunction("stopRecording") {
            try await ensureConfiguredVoiceProvider()
            // VoiceProvider handles stopping internally
        }

        AsyncFunction("mute") {
            guard let voiceProvider = voiceProvider else { return }
            // VoiceProvider would handle muting through its audio session
        }
        
        AsyncFunction("unmute") {
            guard let voiceProvider = voiceProvider else { return }
            // VoiceProvider would handle unmuting through its audio session
        }

        AsyncFunction("enqueueAudio") { (base64EncodedAudio: String) in
            try await ensureConfiguredVoiceProvider()
            
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
            
            // VoiceProvider would handle audio playback
        }
        
        AsyncFunction("stopPlayback") {
            guard let voiceProvider = voiceProvider else { return }
            // VoiceProvider would handle playback interruption
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

    private func ensureConfiguredVoiceProvider() async throws {
        if voiceProvider != nil && isConfigured {
            return
        }
        
        // For basic usage, we'll create a minimal VoiceProvider setup
        // In a real app, you'd need a proper Hume client with authentication
        let token = "your-access-token" // This should come from your app configuration
        let humeClient = HumeClient(options: .accessToken(token: token))
        voiceProvider = VoiceProvider(client: humeClient)
        
        isConfigured = true
    }
}
