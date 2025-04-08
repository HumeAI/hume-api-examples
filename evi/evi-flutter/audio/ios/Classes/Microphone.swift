import AVFoundation
import Foundation

public enum MicrophoneError: Error {
    case conversionFailed(details: String)
    case setupFailed(details: String)
}

public class Microphone {
    public static let sampleRate: Double = 44100
    public static let isLinear16PCM: Bool = true
    private static let desiredInputFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: sampleRate, channels: 1, interleaved: false)!
    
    private var audioEngine: AVAudioEngine?
    private var inputNode: AVAudioInputNode?
    private var isMuted: Bool = false
    private var onError: ((MicrophoneError) -> Void)?
    
    public init() {
        self.isMuted = false
    }
    
    public func onError(_ onError: @escaping (MicrophoneError) -> Void) {
        self.onError = onError
    }
    
    public func mute() {
        self.isMuted = true
    }
    
    public func unmute() {
        self.isMuted = false
    }
    
    private func setupAudioEngine() throws {
        self.audioEngine = AVAudioEngine()
        guard let audioEngine = self.audioEngine else {
            throw MicrophoneError.setupFailed(details: "Failed to create audio engine")
        }
        
        self.inputNode = audioEngine.inputNode
        guard let inputNode = self.inputNode else {
            throw MicrophoneError.setupFailed(details: "Failed to get input node")
        }
        
        let outputNode: AVAudioOutputNode = audioEngine.outputNode
        let mainMixerNode: AVAudioMixerNode = audioEngine.mainMixerNode
        audioEngine.connect(mainMixerNode, to: outputNode, format: nil)
        
        try inputNode.setVoiceProcessingEnabled(true)
        try outputNode.setVoiceProcessingEnabled(true)
        
        if #available(iOS 17.0, *) {
            let duckingConfig = AVAudioVoiceProcessingOtherAudioDuckingConfiguration(enableAdvancedDucking: false, duckingLevel: .max)
            inputNode.voiceProcessingOtherAudioDuckingConfiguration = duckingConfig
        }
    }
    
    public func startRecording(onBase64EncodedAudio: @escaping (String) -> Void) throws {
        if audioEngine == nil {
            try setupAudioEngine()
        }
        
        guard let audioEngine = self.audioEngine, let inputNode = self.inputNode else {
            throw MicrophoneError.setupFailed(details: "Audio engine not properly initialized")
        }
        
        let nativeInputFormat = inputNode.inputFormat(forBus: 0)
        let inputBufferSize = UInt32(nativeInputFormat.sampleRate * 0.1)
        
        inputNode.installTap(onBus: 0, bufferSize: inputBufferSize, format: nativeInputFormat) { (buffer, time) in
            let convertedBuffer = AVAudioPCMBuffer(pcmFormat: Microphone.desiredInputFormat, frameCapacity: 1024)!
            
            var error: NSError? = nil

            if self.isMuted {
                let silence = Data(repeating: 0, count: Int(convertedBuffer.frameCapacity) * Int(convertedBuffer.format.streamDescription.pointee.mBytesPerFrame))
                onBase64EncodedAudio(silence.base64EncodedString())
                return
            }
            
            let inputAudioConverter = AVAudioConverter(from: nativeInputFormat, to: Microphone.desiredInputFormat)!
            let status = inputAudioConverter.convert(to: convertedBuffer, error: &error, withInputFrom: {inNumPackets, outStatus in
                outStatus.pointee = .haveData
                buffer.frameLength = inNumPackets
                return buffer
            })
            
            if status == .haveData {
                let byteLength = Int(convertedBuffer.frameLength) * Int(convertedBuffer.format.streamDescription.pointee.mBytesPerFrame)
                let audioData = Data(bytes: convertedBuffer.audioBufferList.pointee.mBuffers.mData!, count: byteLength)
                let base64String = audioData.base64EncodedString()
                onBase64EncodedAudio(base64String)
                return
            }
            if error != nil {
                self.onError?(MicrophoneError.conversionFailed(details: error!.localizedDescription))
                return
            }
            self.onError?(MicrophoneError.conversionFailed(details: "Unexpected status during audio conversion: \(status)"))
        }
        
        if (!audioEngine.isRunning) {
            try audioEngine.start()
        }
    }
    
    public func stopRecording() {
        audioEngine?.stop()
        inputNode?.removeTap(onBus: 0)
    }
}