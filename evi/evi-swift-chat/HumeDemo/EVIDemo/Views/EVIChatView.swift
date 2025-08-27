//
//  ProductsListView.swift
//  HumeDemo
//
//  Created by Daniel Rees on 5/18/24.
//

import SwiftUI
import Hume
import AVFoundation

struct EVIChatView: View {
    
    @EnvironmentObject var model: EVIChatModel
    
    @State private var message: String = ""
    
    // TODO: Show when the socket disconnects
    // TODO: Allow the socket to reconnect
    
    private var displayedEvents: [EventRow] {
        model.events.filter { eventRow in
            switch eventRow.event {
            case .audioOutput: return false
            default: return true
            }
        }
    }
    
    
    var body: some View {
        VStack {
            List {
                ForEach(displayedEvents) { eventRow in
                    EventRowView(eventRow: eventRow)
                        .flippedUpsideDown()
                        .padding(.vertical)
                }
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets())
            }
            .listStyle(.plain)
            .flippedUpsideDown()
            Spacer()
            VStack {
                HStack(spacing: 16) {
                    TextField("Talk with EVI", text: $message)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .submitLabel(.send)
                        .onSubmit { sendUserMessage() }
                }
                
                HStack(spacing: 20) {
                    Button("Send as User Input") {
                        guard message.count > 0 else { return }
                        sendUserMessage()
                    }
                    .buttonStyle(.borderedProminent)
                    
                    Button("Send as Assistant Input") {
                        guard message.count > 0 else { return }
                        sendAssistantMessage()
                    }
                    .buttonStyle(.bordered)
                    
                    phoneButton()

                }
            }
            
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 20)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .task {
            do {
                try await model.requestRecordPermission()
            } catch {
                print("Error", error)
            }
        }
    }
    
    // MARK: - Views
    @ViewBuilder
    private func phoneButton() -> some View {
        let size: CGFloat = 50
        switch model.connectionState {
        case .connecting, .disconnecting:
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle())
                .frame(width: size, height: size)
        case .connected, .disconnected:
            let imageName = model.connectionState == .connected ? "phone.down.circle.fill" : "phone.circle.fill"
            let color: Color = model.connectionState == .connected ? .red : .green
            
            Button {
                Task {
                    try await model.toggleVoiceProvider()
                }
            } label: {
                Image(systemName: imageName)
                    .resizable()
                    .frame(width: size, height: size)
                    .foregroundStyle(color)
            }
        }
        
    }
    
    // MARK: - Helpers
    private func sendUserMessage() {
        Task {
            try await model.sendMessage(message)
            message = ""
        }
    }
    
    private func sendAssistantMessage() {
        Task {
            try await model.sendAssistantMessage(message)
            message = ""
        }
    }
}


#if DEBUG
struct EVIChatView_Previews: PreviewProvider {
    static var previews: some View {
        return EVIChatView()
            .environmentObject(EVIChatModel.makeForPreview())
    }
}
#endif
