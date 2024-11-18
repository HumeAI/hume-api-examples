import ExpoModulesCore
import AVFoundation
import Foundation

// This is a simple sound player that uses the AVAudioPlayer API to supports playing a single audio
// clip at a time. Maintaining a queue of pending audio clips is left to the user (to be done
// in Javascript).
public class SoundPlayer {
    private var lastAudioPlayer: AVAudioPlayer?
    public func stopPlayback() {
        self.lastAudioPlayer?.stop()
        self.lastAudioPlayer = nil
    }

    // This method takes a chunk of base64-encoded audio and plays it via the AVAudioPlayer API.
    // It uses `withUnsafeThrowingContinuation` so that on the Javascript side it will return a promise
    // that resolves when the audio is finished playing.
    public func playBase64Audio(_ base64String: String) async throws {
        logAudioSessionInfo()
        // It's important to define `delegate` in this scope, as `audioPlayer.delegate` is a weak reference and this will be deallocated if it is only
        // defined within the inner scope of `withUnsafeThrowingContinuation`.
        var delegate: ContinuationDelegate!
        var audioPlayer: AVAudioPlayer!
        return try await withUnsafeThrowingContinuation { continuation in
            do {
                guard let data = Data(base64Encoded: base64String) else {
                    continuation.resume(throwing: NSError(domain: "AudioModule", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid base64 string"]))
                    return
                }
                audioPlayer = try AVAudioPlayer(data: data, fileTypeHint: AVFileType.wav.rawValue)
                self.lastAudioPlayer = audioPlayer
                delegate = ContinuationDelegate(continuation: continuation)
                audioPlayer.delegate = delegate
                audioPlayer.volume = 1.0
                
                print("Starting chunk...")
                let result = audioPlayer.play()
                
                // If you don't include the below lines, audio playback will happen at low volume.
                // This is a workaround for what appears to be an odd bug in AVFoundation related
                // to echo cancellation. See https://forums.developer.apple.com/forums/thread/721535
                try AVAudioSession.sharedInstance().overrideOutputAudioPort(.none)
                try AVAudioSession.sharedInstance().overrideOutputAudioPort(.speaker)


                if (!result) {
                    continuation.resume(throwing: NSError(domain: "AudioModule", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not play audio"]))
                }
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    private func logAudioSessionInfo() {
        let audioSession = AVAudioSession.sharedInstance()

        // Log current route
        print("Current Audio Route:")
        let currentRoute = audioSession.currentRoute
        for output in currentRoute.outputs {
            print("Output - Port Type: \(output.portType.rawValue), Port Name: \(output.portName)")
        }
        for input in currentRoute.inputs {
            print("Input - Port Type: \(input.portType.rawValue), Port Name: \(input.portName)")
        }

        // Log available inputs
        print("\nAvailable Input Devices:")
        for input in audioSession.availableInputs ?? [] {
            print("Port Type: \(input.portType.rawValue), Port Name: \(input.portName)")
        }

        // Log output route from current session
        print("\nAvailable Output Devices (Current Route):")
        for output in currentRoute.outputs {
            print("Port Type: \(output.portType.rawValue), Port Name: \(output.portName)")
        }
        
        print("Audio session volume: \(audioSession.outputVolume)")
        print("Audio player volume: \(lastAudioPlayer?.volume ?? 99999)")
    }

}

// This class is constructed with a `continuation` as provided by `withUnsafeThrowingContinuation` and 
// implements the `AVAudioPlayerDelegate` protocol so that the continuation will be resumed when the audio
// has completed playing or encountered an error.
class ContinuationDelegate : NSObject, AVAudioPlayerDelegate {
    var continuation: UnsafeContinuation<Void, Error>?
    init(continuation: UnsafeContinuation<Void, Error>) {
        self.continuation = continuation
    }
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        print("Ending chunk...")
        continuation?.resume(returning: ())
    }
    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        continuation?.resume(throwing: error!)
    }
}

