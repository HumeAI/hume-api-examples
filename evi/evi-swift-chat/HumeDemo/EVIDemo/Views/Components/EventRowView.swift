//
//  EventRowView.swift
//  HumeDemo
//
//  Created by Chris on 6/26/25.
//

import Hume
import SwiftUI

struct EventRow: Identifiable {
  let id = UUID()
  let event: SubscribeEvent
}

struct EventRowView: View {

  let eventRow: EventRow
  private let spacing: CGFloat = 12

  var body: some View {
    RowView(title: eventRow.event.title) {
      switch eventRow.event {
      case .assistantEnd(_):
        EmptyView()
      case .assistantMessage(let assistantMessage):
        MessageRow.from(assistantMessage: assistantMessage)
      case .webSocketError(let webSocketError):
        DetailedRow(data: webSocketError.asStringDictionary())
      case .userInterruption(let userInterruption):
        DetailedRow(data: userInterruption.asStringDictionary())
      case .userMessage(let userMessage):
        MessageRow.from(userMessage: userMessage)
      case .toolCallMessage(let toolCallMessage):
        DetailedRow(data: toolCallMessage.asStringDictionary())
      case .toolResponseMessage(let toolResponseMessage):
        DetailedRow(data: toolResponseMessage.asStringDictionary())
      case .toolErrorMessage(let toolErrorMessage):
        DetailedRow(data: toolErrorMessage.asStringDictionary())
      case .chatMetadata(let metadata):
        DetailedRow(data: metadata.asStringDictionary())
      case .assistantProsodyMessage(let message):
        MessageRow.from(assistantProsodyMessage: message)
      default:
        EmptyView()
      }
    }
    .background(eventRow.event.backgroundColor)
  }
}

// MARK: - Extensions

extension SubscribeEvent {
  fileprivate var title: String {
    switch self {
    case .assistantEnd:
      return "Assistant End"
    case .assistantMessage:
      return "Assistant Message"
    case .audioOutput:
      return "Audio Output"
    case .chatMetadata:
      return "Chat Metadata"
    case .webSocketError:
      return "WebSocket Error"
    case .userInterruption:
      return "User Interruption"
    case .userMessage:
      return "User Message"
    case .toolCallMessage:
      return "Tool Call Message"
    case .toolResponseMessage:
      return "Tool Response Message"
    case .toolErrorMessage:
      return "Tool Error Message"
    case .assistantProsodyMessage(let msg):
      print(msg)
      return "Assistant Prosody Message"
    }
  }

  fileprivate var backgroundColor: Color {
    switch self {
    case .webSocketError, .toolErrorMessage: return .red.opacity(0.3)
    default: return Color.secondary.opacity(0.1)
    }
  }
}
