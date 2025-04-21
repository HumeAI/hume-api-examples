import AVFoundation
import Foundation

public enum SoundPlayerError: Error {
    case invalidBase64String
    case couldNotPlayAudio
    case decodeError(details: String)
}

public class SoundPlayer: NSObject, AVAudioPlayerDelegate {
    private var audioPlayer: AVAudioPlayer?

    // EVI can send audio output messages faster than they can be played back.
    // It is important to buffer them in a queue so as not to cut off a clip of
    // playing audio with a more recent clip.
    private var audioQueue: [Data] = []  // Queue for audio segments

    private var isPlaying: Bool = false  // Tracks if audio is currently playing
    private var onError: ((SoundPlayerError) -> Void)?

    public func onError(_ onError: @escaping (SoundPlayerError) -> Void) {
        self.onError = onError
    }

    public func stopPlayback() {
        self.audioPlayer?.stop()
        self.audioPlayer = nil
        self.audioQueue.removeAll()  // Clear the queue
        isPlaying = false
    }

    public func enqueueAudio(_ base64String: String) async throws {
        guard let data = Data(base64Encoded: base64String) else {
            throw SoundPlayerError.invalidBase64String
        }
        audioQueue.append(data)
        // If not already playing, start playback
        if !isPlaying {
            do {
                try playNextInQueue()
            } catch {
                if let soundError = error as? SoundPlayerError {
                    self.onError?(soundError)
                } else {
                    self.onError?(SoundPlayerError.decodeError(details: error.localizedDescription))
                }
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

        self.audioPlayer = try AVAudioPlayer(data: data, fileTypeHint: AVFileType.wav.rawValue)

        let session: AVAudioSession = AVAudioSession.sharedInstance()
        self.audioPlayer!.prepareToPlay()
        self.audioPlayer!.delegate = self
        let result = audioPlayer!.play()

        let isSpeaker =
            session.currentRoute.outputs.first?.portType == AVAudioSession.Port.builtInSpeaker
        if isSpeaker {
            // This is to work around an issue with AVFoundation and voiceProcessing: https://forums.developer.apple.com/forums/thread/721535
            self.audioPlayer!.volume = 1.0
            try session.overrideOutputAudioPort(.none)
            try session.overrideOutputAudioPort(.speaker)
        }
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
