import ExpoModulesCore
import AVFoundation

public class AudioModule: Module {
    private var audioEngine: AVAudioEngine?
    private var inputNode: AVAudioInputNode?
    private var audioPlayerNode: AVAudioPlayerNode?
    
    private static let sampleRate: Double = 44100
    private static let channels: AVAudioChannelCount = 2
    private static let playbackAudioFormat = AVAudioFormat(
        standardFormatWithSampleRate: sampleRate,
        channels: channels
    )
    private static let bytesPerFrame = playbackAudioFormat?.streamDescription.pointee.mBytesPerFrame ?? 1
    
    public func definition() -> ModuleDefinition {
        Name("Audio")
        
        Constants([:])
        
        Events("onAudioInput")
        
        AsyncFunction("getPermissions") {
            return try await self.getPermissions();
        }
        
        AsyncFunction("startRecording") {
            self.startRecording()
        }
        
        AsyncFunction("stopRecording") {
            self.stopRecording()
        }
        
        AsyncFunction("playAudio") { (base64EncodedAudio: String) in
            return try await self.playBase64Audio(base64EncodedAudio)
        }
    }
    
    private func getPermissions() async throws -> Bool {
        print("Attempting to get audio permissions")
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
            throw NSError(domain: "AudioModule", code: 1, userInfo: [NSLocalizedDescriptionKey: "Unknown permission state"])
        }
    }
    
    private func startRecording() {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playAndRecord, mode: .default, options: [])
            try audioSession.setActive(true)
        } catch {
            print("Failed to activate audio session: \(error.localizedDescription)")
            return
        }
        
        let audioEngine = AVAudioEngine()
        self.audioEngine = audioEngine
        let inputNode = audioEngine.inputNode
        self.inputNode = inputNode
        let format = inputNode.inputFormat(forBus: 0)
        let bufferSize = AVAudioFrameCount(format.sampleRate * 0.1) // 100ms of audio
        
        inputNode.installTap(onBus: 0, bufferSize: bufferSize, format: format) { [weak self] (buffer, time) in
            let byteLength = Int(buffer.frameLength) * Int(buffer.format.streamDescription.pointee.mBytesPerFrame)
            let audioData = Data(bytes: buffer.audioBufferList.pointee.mBuffers.mData!, count: byteLength)
            let base64String = audioData.base64EncodedString()
            self?.sendEvent("onAudioInput", ["base64EncodedAudio": base64String])
        }
        
        do {
            try audioEngine.start()
            print("Audio engine started successfully")
        } catch {
            print("Failed to start audio engine: \(error.localizedDescription)")
        }
    }
    
    private func stopRecording() {
        audioEngine?.stop()
        self.inputNode?.removeTap(onBus: 0)
    }
    
    private func initAudioPlayer() {
        guard let audioEngine = self.audioEngine else { return }
        let audioPlayerNode = AVAudioPlayerNode()
        self.audioPlayerNode = audioPlayerNode
        audioEngine.connect(audioPlayerNode, to: audioEngine.mainMixerNode, format: audioEngine.mainMixerNode.outputFormat(forBus: 0))
    }
    
    private func playBase64Audio(_ base64String: String) async throws -> Bool {
        if self.audioPlayerNode == nil {
            initAudioPlayer()
        }
        guard let audioPlayerNode else { return false }
        
        guard let audioData = Data(base64Encoded: base64String) else {
            throw NSError(domain: "AudioModule", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid Base64 string"])
        }
        
        let frameLength = UInt32(audioData.count) / AudioModule.bytesPerFrame
        guard let buffer = AVAudioPCMBuffer(pcmFormat: AudioModule.playbackAudioFormat!, frameCapacity: frameLength) else {
            throw NSError(domain: "AudioPlaybackEngine", code: 2, userInfo: [NSLocalizedDescriptionKey: "Unable to create buffer"])
        }
        buffer.frameLength = frameLength
        
        audioData.withUnsafeBytes { bufferPtr in
            guard let audioPtr = bufferPtr.bindMemory(to: Float.self).baseAddress else { return }
            buffer.floatChannelData?.pointee.assign(from: audioPtr, count: Int(frameLength))
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            audioPlayerNode.scheduleBuffer(buffer, at: nil, options: .interrupts) {
                continuation.resume(returning: true)
            }
        }
    }
}
