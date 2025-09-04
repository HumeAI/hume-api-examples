//
//  UtteranceView.swift
//  HumeDemo
//
//  Created by Chris on 6/26/25.
//

import Hume
import SwiftUI

struct TTSEventView: View {

  @EnvironmentObject var model: TTSModel

  let event: TTSEvent

  var body: some View {
    RowView(title: event.title) {
      switch event {
      case .json(let utteranceEvent):
        jsonEventView(utteranceEvent)
      case .file(let fileEvent):
        fileView(fileEvent)
      case .streamStart, .streamEnd: EmptyView()
      case .error(let error):
        Text(error)
      }

    }
  }

  // MARK: - Views
  @ViewBuilder
  private func jsonEventView(_ utteranceEvent: TTSEvent.JSON) -> some View {
    HStack {
      VStack(alignment: .leading, spacing: 8) {
        utteranceListView(utteranceEvent.postedTts.utterances)
        Divider()
        ForEach(utteranceEvent.returnTts.generations, id: \.self) { generation in
          VStack(alignment: .leading) {
            Text("Gen ID: \(generation.generationId)")
            Text("Duration: \(generation.duration)")
          }
          .font(.body)
        }
      }
      .frame(maxWidth: .infinity)

      VStack {
        playButton(for: event)
      }
    }
  }

  @ViewBuilder
  private func fileView(_ fileEvent: TTSEvent.File) -> some View {
    HStack {
      VStack(alignment: .leading, spacing: 8) {
        utteranceListView(fileEvent.postedTts.utterances)
        Divider()
        Text("File size: \(fileEvent.data.count)")
      }
      .frame(maxWidth: .infinity)

      VStack(spacing: 20) {
        downloadButton(for: fileEvent.data, format: fileEvent.postedTts.format)
        playButton(for: event)
      }
    }
  }

  @ViewBuilder
  private func utteranceListView(_ utterances: [PostedUtterance]) -> some View {
    ForEach(utterances, id: \.self) { utterance in
      VStack {
        Text(utterance.text)
        if let desc = utterance.description, !desc.isEmpty {
          Text("Voice: \(desc)").italic()
        }
      }
    }
  }

  @ViewBuilder
  private func downloadButton(for data: Data, format: Format?) -> some View {
    Button(action: {
      // set file name to current timestamp
      let fileName = "tts_output_\(Date().timeIntervalSince1970).\(format?.asString ?? "")"
      let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
      do {
        try data.write(to: tempURL)
        let activityViewController = UIActivityViewController(
          activityItems: [tempURL], applicationActivities: nil)
        if let rootVC = UIApplication.shared.windows.first?.rootViewController {
          rootVC.present(activityViewController, animated: true, completion: nil)
        }
      } catch {
        print("Failed to save file: \(error.localizedDescription)")
      }
    }) {
      Image(systemName: "arrow.down.circle")
        .foregroundColor(.blue)
        .font(.title)
    }
  }

  @ViewBuilder
  private func playButton(for ttsEvent: TTSEvent) -> some View {
    Button(action: {
      model.playEvent(ttsEvent, format: model.selectedFormat)
    }) {
      Image(systemName: "play.circle")
        .foregroundColor(.blue)
        .font(.title)
    }
  }
}

extension Format {
  fileprivate var asString: String {
    switch self {
    case .mp3: return "mp3"
    case .wav: return "wav"
    case .pcm: return "pcm"
    }
  }
}
