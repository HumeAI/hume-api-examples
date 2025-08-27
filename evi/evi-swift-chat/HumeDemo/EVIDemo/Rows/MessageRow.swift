//
//  UserMessageRow.swift
//  HumeDemo
//
//  Created by Daniel Rees on 5/23/24.
//

import SwiftUI
import Hume

struct MessageRow: View {
    let content: String?
    var isInterim: Bool = false
    let prosody: ProsodyInference?
    
    @ViewBuilder
    static func from(assistantMessage: AssistantMessage) -> MessageRow {
        MessageRow(content: assistantMessage.message.content, prosody: assistantMessage.models.prosody)
    }
    
    @ViewBuilder
    static func from(assistantProsodyMessage: AssistantProsodyMessage) -> MessageRow {
        MessageRow(content: nil, prosody: assistantProsodyMessage.models.prosody)
    }
    
    @ViewBuilder
    static func from(userMessage: UserMessage) -> MessageRow {
        MessageRow(content: userMessage.message.content, isInterim: userMessage.interim, prosody: userMessage.models.prosody)
    }
    
    var body: some View {
        VStack(alignment: .leading) {
            Text(content ?? "N/A")
            if isInterim {
                HStack {
                    Text("Interim messsage")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 8)
            }
            Divider()
            
            VStack(alignment: .leading) {
                if let prosody {
                    Text("Detected Expressions")
                        .font(.subheadline)
                        .bold()
                    
                    ForEach(prosody.scores.topThree, id: \.name) { measurement in
                        HStack {
                            Text(measurement.name)
                            Spacer()
                            Text("\(measurement.value)")
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity)
        }
    }
}
