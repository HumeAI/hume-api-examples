//
//  AssistantMessageRow.swift
//  HumeDemo
//
//  Created by Daniel Rees on 5/23/24.
//

import SwiftUI
import Hume

struct AssistantMessageRow: View {
    
    let resource: AssistantMessage
    
    var body: some View {
        VStack {
            HStack {
                Text("ASSISTANT")
                    .font(.caption)
                Spacer()
                    
            }
            HStack {
                VStack {
                    Text(resource.message.content!)
                }
                .frame(maxWidth: .infinity)
                
                VStack {
                    if let prosody = resource.models.prosody {
                        Text("Detected Expressions")
                            .font(.subheadline)
                        
                        ForEach(prosody.scores.topThree, id: \.0) { (emotion, score) in
                            HStack {
                                Text(emotion)
                                Text("\(score)")
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity)
                
                    
            }
            
        }
        .padding()
//        .background(.white)
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(.gray, lineWidth: 1)
        )
    }
}

