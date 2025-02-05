import AVFoundation
import Foundation

public enum MicrophoneError: Error {
    case conversionFailed(details: String)
}
public class Microphone {
    public static let sampleRate: Double = 44100
    public static let isLinear16PCM: Bool = true
    // Linear16 PCM is a standard format well-supported by EVI (although you must send
    // a `session_settings` message to inform EVI of the sample rate). Because there is
    // a wide variance of the native format/ sample rate from input devices, we use the 
    // AVAudioConverter API to convert the audio to this standard format in order to
    // remove all guesswork.
    private static let desiredInputFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: sampleRate, channels: 1, interleaved: false)!
    
    public var audioEngine: AVAudioEngine
    private var inputNode: AVAudioInputNode
    private var isMuted: Bool = false
    private var onError: ((MicrophoneError) -> Void)?
    
    public init() {
        self.isMuted = false
        self.audioEngine = AVAudioEngine()
        self.inputNode = audioEngine.inputNode
        
        do {
            let outputNode: AVAudioOutputNode = audioEngine.outputNode
            let mainMixerNode: AVAudioMixerNode = audioEngine.mainMixerNode
            audioEngine.connect(mainMixerNode, to: outputNode, format: nil)
            
            // Voice processing is a feature that can help reduce echo and background noise
            // It is very important for audio chat applications like EVI, because without
            // echo cancellation, EVI will hear its own output and attempt to respond to it.

            // `setVoiceProcessingEnabled` should be enabled on *both* the input and output nodes
            // because it works by observing signals that are sent to the output node (the
            // speaker) and then "cancels" the echoes of those signals from what comes
            // back into the input node (the microphone).
            try self.inputNode.setVoiceProcessingEnabled(true)
            try outputNode.setVoiceProcessingEnabled(true)
            
            if #available(iOS 17.0, *) {
                let duckingConfig = AVAudioVoiceProcessingOtherAudioDuckingConfiguration(enableAdvancedDucking: false, duckingLevel: .max)
                inputNode.voiceProcessingOtherAudioDuckingConfiguration = duckingConfig
            }
        } catch {
            print("Error setting voice processing: \(error)")
            return
        }
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
    
    public func startRecording(onBase64EncodedAudio: @escaping (String) -> Void) throws {
        let nativeInputFormat = self.inputNode.inputFormat(forBus: 0)
        // The sample rate is "samples per second", so multiplying by 0.1 should get us chunks of about 100ms
        let inputBufferSize = UInt32(nativeInputFormat.sampleRate * 0.1)
        self.inputNode.installTap(onBus: 0, bufferSize: inputBufferSize, format: nativeInputFormat) { (buffer, time) in
            let convertedBuffer = AVAudioPCMBuffer(pcmFormat: Microphone.desiredInputFormat, frameCapacity: 1024)!
            
            var error: NSError? = nil

            if self.isMuted {
                // The standard behavior for muting is to send audio frames filled with empty data
                // (versus not sending anything during mute). This helps audio systems distinguish
                // between muted-but-still-active streams and streams that have become disconnected.
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
        audioEngine.stop()
        self.inputNode.removeTap(onBus: 0)
    }
}
