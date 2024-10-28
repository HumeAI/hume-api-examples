import ExpoModulesCore
import AVFoundation

public class AudioModule: Module {
    private lazy var audioEngine = {
        AVAudioEngine()
    }()
    private lazy var inputNode = {
        do {
            /// This outputs a lot of warnings to the console but still cancels the echo. I'd love to figure out why but haven't been unsuccessful so far
            try inputNode.setVoiceProcessingEnabled(true)
        } catch {
            onError("Error enabling voice processing: \(error.localizedDescription)")
        }
        return self.audioEngine.inputNode
    }()

    private static let desiredInputFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: sampleRate, channels: 1, interleaved: false)

    private lazy var nativeInputFormat = {
        self.inputNode.inputFormat(forBus: 0)
    }()
    private static var audioConverter = {
        AVAudioConverter(from: nativeInputFormat, to: desiredInputFormat)
    }()
    private lazy var bufferSize: AVAudioFrameCount = {
        // 100ms of audio
        UInt32(self.nativeInputFormat.sampleRate * 0.1)
    }()
    private lazy var audioPlayerNode = {
        AVAudioPlayerNode()
    }()
    private lazy var audioSession = {
        AVAudioSession.sharedInstance()
    }()

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
        // TODO: probably it would be good to surface error conditions here to the
        // Javascript side in a way they can catch
        do {
            try self.audioSession.setCategory(.playAndRecord, mode: .default)
            try self.audioSession.setActive(true)
        } catch {
            print("Failed to activate audio session: \(error.localizedDescription)")
            return
        }

        inputNode.installTap(onBus: 0, bufferSize: self.bufferSize, format: self.inputFormat) { [weak self] (buffer, time) in
            let byteLength = Int(buffer.frameLength) * Int(buffer.format.streamDescription.pointee.mBytesPerFrame)
            let audioData = Data(bytes: buffer.audioBufferList.pointee.mBuffers.mData!, count: byteLength)
            let base64String = audioData.base64EncodedString()
            self?.sendEvent("onAudioInput", ["base64EncodedAudio": base64String])
        }
        
        if (!audioEngine.isRunning) {
            do {
                try audioEngine.start()
                print("Audio engine started successfully")
            } catch {
                print("Failed to start audio engine: \(error.localizedDescription)")
            }
        }
    }
    
    private func stopRecording() {
        audioEngine.stop()
        self.inputNode.removeTap(onBus: 0)
    }
    
    private func playBase64Audio(_ base64String: String) async throws -> Bool {
        self.audioEngine.connect(self.audioPlayerNode, to: self.audioEngine.mainMixerNode, format: self.audioEngine.mainMixerNode.outputFormat(forBus: 0))
        
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
            buffer.floatChannelData?.pointee.update(from: audioPtr, count: Int(frameLength))
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            audioPlayerNode.scheduleBuffer(buffer, at: nil, options: .interrupts) {
                continuation.resume(returning: true)
            }
        }
    }
}
