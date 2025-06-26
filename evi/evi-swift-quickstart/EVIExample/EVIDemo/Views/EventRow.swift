//
//  EventRow.swift
//  EVIExample
//
//  Created by Chris on 6/16/25.
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
        VStack(alignment: .leading, spacing: spacing) {
            HStack {
                Text(eventRow.event.title)
                    .padding(.top, spacing / 2)
                    .font(.caption)
                Spacer()
                    
            }
            Group {
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
                default:
                    EmptyView()
                }
            }
        }
        .padding(.horizontal, spacing)
        .padding(.bottom, spacing)
        .background(eventRow.event.backgroundColor)
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.secondary, lineWidth: 1)
        )
    }
}


fileprivate extension SubscribeEvent {
    var title: String {
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
        }
    }
    
    var backgroundColor: Color {
        switch self {
        case .webSocketError, .toolErrorMessage: return .red.opacity(0.3)
        default: return Color.secondary.opacity(0.1)
        }
    }
}
