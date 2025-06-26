import AVFoundation
import Combine
import SwiftUI
import Hume

class EVIChatModel: ObservableObject {
    
    private let voiceProvider: VoiceProvider
    
    @Published var events: [EventRow] = []
    @Published var connectionState: VoiceProviderState = .disconnected
    
    private var connectionStateCancellable: AnyCancellable?
        
    init(client: HumeClient) {
        self.voiceProvider = VoiceProvider(client: client)
        self.voiceProvider.delegate = self
        
        // Using combine to pass through connection state to the model
        self.connectionStateCancellable = voiceProvider.state
            .sink(receiveValue: { state in
                self.connectionState = state
            })
    }
    
    func sendMessage(_ message: String) async throws {
        try await self.voiceProvider.sendUserInput(message: message)
    }
    
    func sendAssistantMessage(_ message: String) async throws {
        try await self.voiceProvider.sendAssistantInput(message: message)
    }
    
    func requestRecordPermission() async throws {
        let granted = await MicrophonePermission.requestPermissions()
        if granted {
            print("granted")
            try await startVoiceProvider()
        } else {
            print("denied")
        }
    }
    
    func toggleVoiceProvider() async throws {
        if self.connectionState == .connected {
            await stopVoiceProvider()
        } else {
            try await startVoiceProvider()
        }
    }
    
    func startVoiceProvider() async throws {
        try await self.voiceProvider.connect(
            configId: <#Enter your config id from https://platform.hume.ai#>,
            configVersion: nil,
            resumedChatGroupId: nil,
            sessionSettings: SessionSettings()
            )
    }
    
    func stopVoiceProvider() async {
        await self.voiceProvider.disconnect()
    }
}

// MARK: - Voice Provider Delegate
extension EVIChatModel: VoiceProviderDelegate {
    func voiceProviderDidConnect(_ voiceProvider: any VoiceProvidable) {
        print(" Voice provider connected")
    }
    
    func voiceProviderDidDisconnect(_ voiceProvider: any VoiceProvidable) {
        print("Voice provider disconnected")
    }
    
    func voiceProvider(_ voiceProvider: any VoiceProvidable, didProduceEvent event: SubscribeEvent) {
        let eventRow = EventRow(event: event)
        Task { @MainActor in
            self.events.insert(eventRow, at: 0)
        }
    }
    
    func voiceProvider(_ voiceProvider: any VoiceProvidable, didProduceError error: VoiceProviderError) {
        print("voiceProvider didProduceError:", error)
    }

    func voiceProvider(_ voiceProvider: any VoiceProvidable, didReceieveAudioInputMeter audioInputMeter: Float) {
//        print("voiceProvider didReceiveAudioInputMeter:", audioInputMeter)
    }

    func voiceProvider(_ voiceProvider: any VoiceProvidable, didReceieveAudioOutputMeter audioOutputMeter: Float) {
        // commented out to avoid excessive logging (every
//        print("voiceProvider didReceiveAudioOutputMeter:", audioOutputMeter)
    }

    func voiceProviderWillDisconnect(_ voiceProvider: any VoiceProvidable) {
        print("voiceProviderWillDisconnect")
    }

    func voiceProvider(_ voiceProvider: any VoiceProvidable, didPlayClip clip: SoundClip) {
        print("voiceProvider didPlayClip:", clip)
    }
}
