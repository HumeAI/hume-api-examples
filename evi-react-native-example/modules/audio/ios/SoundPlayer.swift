import AVFoundation
import Foundation

public enum SoundPlayerError: Error {
    case invalidBase64String
    case couldNotPlayAudio
    case decodeError(details: String)
}

public class SoundPlayer: NSObject, AVAudioPlayerDelegate {
    private var lastAudioPlayer: AVAudioPlayer?
    private var audioQueue: [Data] = []  // Queue for audio segments
    private var isPlaying: Bool = false  // Tracks if audio is currently playing
    private var onError: ((SoundPlayerError) -> Void)?

    public func onError(_ onError: @escaping (SoundPlayerError) -> Void) {
        self.onError = onError
    }

    public func stopPlayback() {
        self.lastAudioPlayer?.stop()
        self.lastAudioPlayer = nil
        self.audioQueue.removeAll()  // Clear the queue
        isPlaying = false
    }

    public func enqueueAudio(_ base64String: String) async throws {
        print("Enqueueing audio...")
        guard let data = Data(base64Encoded: base64String) else {
            throw SoundPlayerError.invalidBase64String
        }
        audioQueue.append(data)
        // If not already playing, start playback
        if !isPlaying {
            do {
                try playNextInQueue()
            } catch {
                self.onError?(error as! SoundPlayerError)
            }
        }
    }

    private func playNextInQueue() throws {
        guard !audioQueue.isEmpty else {
            isPlaying = false
            return
        }

        isPlaying = true
        let data = audioQueue.removeFirst()

        let audioPlayer = try AVAudioPlayer(data: data, fileTypeHint: AVFileType.wav.rawValue)
        self.lastAudioPlayer = audioPlayer

        audioPlayer.delegate = self
        audioPlayer.volume = 1.0
        let result = audioPlayer.play()
        if !result {
            throw SoundPlayerError.couldNotPlayAudio
        }
    }

    public func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        do {
            try playNextInQueue()
        } catch {
            self.onError?(error as! SoundPlayerError)
        }
    }

    public func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        self.onError?(
            SoundPlayerError.decodeError(details: error?.localizedDescription ?? "Unknown error"))
    }
}
