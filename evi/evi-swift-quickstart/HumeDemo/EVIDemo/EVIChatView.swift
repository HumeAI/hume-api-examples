//
//  ProductsListView.swift
//  HumeDemo
//
//  Created by Daniel Rees on 5/18/24.
//

import SwiftUI
import Hume
import AVFoundation

struct EventRow: Identifiable {
    let id = UUID()
    let event: SubscribeEvent
}

struct EventRowView: View {
    
    let eventRow: EventRow
    
    var body: some View {
        switch eventRow.event {
        case .assistantEnd(let assistantEnd):
            AssistantEndRow(resource: assistantEnd)
        case .assistantMessage(let assistantMessage):
            AssistantMessageRow(resource: assistantMessage)
        case .webSocketError(let webSocketError):
            WebSocketErrorRow(resource: webSocketError)
        case .userInterruption(let userInterruption):
            UserInterruptionRow(resource: userInterruption)
        case .userMessage(let userMessage):
            UserMessageRow(resource: userMessage)
        case .toolCallMessage(let toolCallMessage):
            ToolCallMessageRow(resource: toolCallMessage)
        case .toolResponseMessage(let toolResponseMessage):
            ToolResponseMessageRow(resource: toolResponseMessage)
        case .toolErrorMessage(let toolErrorMessage):
            ToolErrorMessageRow(resource: toolErrorMessage)
        default:
            EmptyView()
        }
    }
}

@MainActor
class EVIChatModel: NSObject, ObservableObject {
    
    private let voiceProvider: VoiceProvider
    
    @Published var events: [EventRow] = []
    
    override init() {
        self.voiceProvider = VoiceProvider(
            apiKey: Secrets.apiKey,
            clientSecret: Secrets.clientSecret)
        super.init()
        
        self.voiceProvider.onMessage = { event in
            let eventRow = EventRow(event: event)
            self.events.insert(eventRow, at: 0)
        }
    }
    
    func sendMessage(_ message: String) async {
        await self.voiceProvider.sendUserInput(message: message)
    }
    
    func sendAssistantMessage(_ message: String) async {
        await self.voiceProvider.sendAssistantInput(message: message)
    }
    
    func requestRecordPermission() async throws{
        AVAudioApplication.requestRecordPermission { granted in
            if granted {
                print("granted")
                Task {
                    try await self.voiceProvider.connect()
                }
            } else {
                print("denied")
            }
        }
    }
}


struct EVIChatView: View {
    
    @StateObject var model = EVIChatModel()
    
    @State private var message: String = ""
    
    // TODO: Show when the socket disconnects
    // TODO: Allow the socket to reconnect
    
    
    var body: some View {
        VStack {
            List {
                ForEach(model.events) { eventRow in
                    EventRowView(eventRow: eventRow)
                        .flippedUpsideDown()
                }
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets())
            }
            .listStyle(.plain)
            .flippedUpsideDown()
            Spacer()
            VStack {
                HStack(spacing: 16) {
                    TextField("Talk with Hume", text: $message)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                }
                HStack {
                    Button("Send UserInput") {
                        guard message.count > 0 else { return }
                        Task {
                            await model.sendMessage(message)
                            message = ""
                        }
                    }
                    Spacer().frame(width: 20)
                    Button("Send AssistantInput") {
                        guard message.count > 0 else { return }
                        Task {
                            await model.sendAssistantMessage(message)
                            message = ""
                        }
                    }
                    .foregroundStyle(Color.gray)
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
}



struct FlippedUpsideDown: ViewModifier {
    func body(content: Content) -> some View {
        content
            .rotationEffect(.radians(.pi))
            .scaleEffect(x: -1, y: 1, anchor: .center)
    }
}
extension View{
    func flippedUpsideDown() -> some View{
        self.modifier(FlippedUpsideDown())
    }
}
