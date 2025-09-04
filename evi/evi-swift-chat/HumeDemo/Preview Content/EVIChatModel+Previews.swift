//
//  EVIChatModel+Previews.swift
//  HumeDemo
//
//  Created by Chris on 6/16/25.
//

import Foundation
import Hume

extension EVIChatModel {
  static func makeForPreview() -> EVIChatModel {
    let previewModel = EVIChatModel(client: HumeClient(options: .accessToken(token: "")))
    previewModel.events = [
      EventRow(event: .assistantEnd(AssistantEnd.mock)),
      EventRow(event: .assistantMessage(AssistantMessage.mock)),
      EventRow(event: .audioOutput(AudioOutput.mock)),
      EventRow(event: .chatMetadata(ChatMetadata.mock)),
      EventRow(event: .webSocketError(WebSocketError.mock)),
      EventRow(event: .userInterruption(UserInterruption.mock)),
      EventRow(event: .userMessage(UserMessage.mock)),
      EventRow(event: .toolCallMessage(ToolCallMessage.mock)),
      EventRow(event: .toolResponseMessage(ToolResponseMessage.mock)),
      EventRow(event: .toolErrorMessage(ToolErrorMessage.mock)),
    ]
    return previewModel
  }
}
