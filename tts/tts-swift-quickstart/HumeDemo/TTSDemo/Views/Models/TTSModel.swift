//
//  TTSModel.swift
//  HumeDemo
//
//  Created by Chris on 6/26/25.
//

import Hume
import SwiftUI

class TTSModel: ObservableObject {
  private let tts: TTS
  private let audioHub: AudioHub
  private let ttsPlayer: TTSPlayer

  @Published var isSubmitting: Bool = false
  @Published var events: [TTSEvent] = []
  @Published var selectedOutputFormat: OutputFormat = .wav
  @Published var selectedTTSMode: TTSMode = .stream
  @Published var selectedEndpoint: TTSType = .file

  var selectedFormat: Format { selectedOutputFormat.asHumeFormat }

  init(tts: TTS) {
    self.tts = tts
    // TODO: inject audioHub
    self.audioHub = AudioHub.shared
    self.ttsPlayer = TTSPlayer(audioHub: audioHub)

    Task {
      await audioHub.prepare()
    }
  }

  #if DEBUG
    @available(
      *, deprecated, renamed: "init(tts:)", message: "only use this initializer for previews"
    )
    init() {
      // FIXME: this is just to inject into previews until we have a HumeTestingUtils with mocks
      self.tts = HumeClient(options: .accessToken(token: "")).tts.tts
      self.audioHub = AudioHub.shared
      self.ttsPlayer = TTSPlayer(audioHub: audioHub)
    }
  #endif

  // MARK: - TTS Integration

  /// Make a request for TTS JSON and plays the result
  func postSynchronousJson(
    text: String, voiceDescription: String, speed: Double, trailingSilence: Double, format: Format
  ) async throws {
    // Build request
    let postedUtterances: [PostedUtterance] = [
      makeUtterance(
        text: text, voiceDescription: voiceDescription, speed: speed,
        trailingSilence: trailingSilence)
    ]
    let request = makePostedTts(postedUtterances: postedUtterances, format: format)

    do {
      // Execute request
      Task { @MainActor in isSubmitting = true }
      let returnTts: ReturnTts = try await tts.synthesizeJson(request: request)

      // Update the view
      let event = TTSEvent.json(.init(postedTts: request, returnTts: returnTts))
      try play(returnTts: returnTts, format: format)
      updateUI(with: event)
    } catch {
      updateUI(with: .error(error.localizedDescription))
      throw error
    }
  }

  /// Make a request for TTS file and plays the result
  func postSynchronousFile(
    text: String, voiceDescription: String, speed: Double, trailingSilence: Double, format: Format
  ) async throws {
    // Build request
    let postedUtterances: [PostedUtterance] = [
      makeUtterance(
        text: text, voiceDescription: voiceDescription, speed: speed,
        trailingSilence: trailingSilence)
    ]
    let request = makePostedTts(postedUtterances: postedUtterances, format: format)

    do {
      // Execute request
      Task { @MainActor in isSubmitting = true }
      let data: Data = try await tts.synthesizeFile(request: request)

      // Update the view
      let event = TTSEvent.file(.init(postedTts: request, data: data))
      try play(data: data, format: format)
      updateUI(with: event)
    } catch {
      updateUI(with: .error(error.localizedDescription))
      throw error
    }
  }

  /// Makes a streaming request and plays each chunk as it arrives
  func streamJson(
    text: String, voiceDescription: String, speed: Double, trailingSilence: Double, format: Format
  ) async throws {
    let postedUtterances: [PostedUtterance] = [
      makeUtterance(
        text: text, voiceDescription: voiceDescription, speed: speed,
        trailingSilence: trailingSilence)
    ]
    let request = makePostedTts(postedUtterances: postedUtterances, format: format)

    updateUI(with: .streamStart)

    do {
      let stream = tts.synthesizeJsonStreaming(request: request)

      for try await snippetChunk in stream {
        guard let soundClip = SoundClip.from(snippetChunk) else {
          print("warn: failed to create sound clip")
          return
        }
        try await ttsPlayer.play(soundClip: soundClip, format: format)
      }
    } catch {
      print("error: \(error.localizedDescription)")
    }

    updateUI(with: .streamEnd)
  }

  /// Makwes a streaming request for a file and plays each chunk as it arrives
  func streamFile(
    text: String, voiceDescription: String, speed: Double, trailingSilence: Double, format: Format
  ) async throws {
    // build request
    let postedUtterances: [PostedUtterance] = [
      makeUtterance(
        text: text, voiceDescription: voiceDescription, speed: speed,
        trailingSilence: trailingSilence)
    ]
    let request = makePostedTts(postedUtterances: postedUtterances, format: format)

    updateUI(with: .streamStart)

    do {
      // make request for stream
      let stream = tts.synthesizeFileStreaming(request: request)

      // iterate over stream and play each chunk as it arrives
      for try await snippetChunk in stream {
        guard let soundClip = SoundClip.from(snippetChunk) else {
          print("warn: failed to create sound clip")
          return
        }
        try await ttsPlayer.play(soundClip: soundClip, format: format)
      }
    } catch {
      print("error: \(error.localizedDescription)")
    }

    updateUI(with: .streamEnd)
  }

  // MARK: - Playing Audio
  func playEvent(_ ttsEvent: TTSEvent, format: Format) {
    do {
      switch ttsEvent {
      case .json(let event):
        try play(returnTts: event.returnTts, format: format)
      case .file(let event):
        try play(data: event.data, format: format)
      default:
        return
      }
    } catch {
      print("Error playing event: \(error.localizedDescription)")
    }
  }

  private func play(returnTts: ReturnTts, format: Format) throws {
    for generation in returnTts.generations {
      // make SoundClip from generation
      guard let soundClip = SoundClip.from(generation) else {
        print("error: failed to create sound clip")
        return
      }
      Task {
        try await ttsPlayer.play(soundClip: soundClip, format: format)
      }
    }
  }

  private func play(data: Data, format: Format) throws {
    guard let soundClip = SoundClip.from(data) else {
      print("error: failed to create sound clip")
      return
    }
    Task {
      try await ttsPlayer.play(soundClip: soundClip, format: format)
    }
  }

  private func playFileStream(for request: PostedTts) async throws {
    guard let format = request.format else {
      assertionFailure("expecting format")
      return
    }
    let stream = tts.synthesizeFileStreaming(request: request)

    var _data: Data = Data()
    for try await data in stream {
      guard let soundClip = SoundClip.from(data) else {
        print("warn: failed to create sound clip")
        return
      }

      try await ttsPlayer.play(soundClip: soundClip, format: format)
      _data.append(data)

    }
    updateUI(with: makeFileEvent(from: request, data: _data))
  }

  private func playJsonStream(for request: PostedTts) async throws {
    guard let format = request.format else {
      assertionFailure("expecting format")
      return
    }

    let stream = tts.synthesizeJsonStreaming(request: request)

    for try await snippetChunk in stream {
      guard let soundClip = SoundClip.from(snippetChunk) else {
        print("warn: failed to create sound clip")
        return
      }
      try await ttsPlayer.play(soundClip: soundClip, format: format)
    }
  }

  // MARK: - Building Requests

  private func makePostedTts(postedUtterances: [PostedUtterance], format: Format) -> PostedTts {
    PostedTts(
      context: nil,
      numGenerations: 1,
      splitUtterances: nil,
      stripHeaders: nil,
      utterances: postedUtterances,
      instantMode: nil,
      format: format)
  }

  private func makeUtterance(
    text: String, voiceDescription: String, speed: Double, trailingSilence: Double
  ) -> PostedUtterance {
    PostedUtterance(
      description: voiceDescription,
      speed: speed,
      trailingSilence: trailingSilence,
      text: text,
      voice: .postedUtteranceVoiceWithId(
        PostedUtteranceVoiceWithId(
          // Replace with your own custom voice ID (`.custom`) or existing voice from the [Voice Library](https://app.hume.ai/voices) (`.humeAi`)
          id: "7f633ac4-8181-4e0d-99e1-11a4ef033691",
          provider: .humeAi))
    )
  }
}

// MARK: - UI Helpers
extension TTSModel {
  private func updateUI(with event: TTSEvent) {
    Task { @MainActor in
      events.insert(event, at: 0)
      isSubmitting = false
    }
  }

  private func makeFileEvent(from request: PostedTts, data: Data) -> TTSEvent {
    TTSEvent.file(
      TTSEvent.File(
        postedTts: PostedTts(
          context: request.context,
          numGenerations: request.numGenerations,
          splitUtterances: request.splitUtterances,
          stripHeaders: request.stripHeaders,
          utterances: request.utterances,
          instantMode: request.instantMode,
          format: request.format),
        data: data)
    )
  }

}
