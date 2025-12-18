import AVFoundation
import Combine
import Hume
import SwiftUI

class EVIChatModel: ObservableObject {

  private let voiceProvider: VoiceProvider

  @Published var events: [EventRow] = []
  @Published var connectionState: VoiceProviderState = .disconnected
  @Published var isMicrophoneMuted: Bool = false
  @Published var isOutputMuted: Bool = false

  private var connectionStateCancellable: AnyCancellable?

  init(client: HumeClient) {
    self.voiceProvider = VoiceProvider(client: client)
    self.voiceProvider.delegate = self

    // Using combine to pass through connection state to the model
    self.connectionStateCancellable = voiceProvider.state
      .sink(receiveValue: { state in
        Task { @MainActor in
          self.connectionState = state
        }
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
      print("mic granted")
    } else {
      print("mic denied")
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
    guard await MicrophonePermission.requestPermissions() else {
      print("Error: missing mic permissions")
      return
    }

    // Get a config id from https://app.hume.ai/evi/configs
    // let options = ChatConnectOptions(configId: "<#config id#>")
    let options = ChatConnectOptions()
    let sessionSettings = SessionSettings(
      audio: nil,  // recommendation: keep nil to allow the SDK to fully manage audio
      builtinTools: nil,
      context: nil,
      customSessionId: nil,
      languageModelApiKey: nil,
      systemPrompt: nil,
      tools: nil,
      variables: nil)

    try await self.voiceProvider.connect(
      with: options,
      sessionSettings: sessionSettings)
  }

  func stopVoiceProvider() async {
    await self.voiceProvider.disconnect()
  }

  func toggleMicrophoneMute() {
    isMicrophoneMuted.toggle()
    voiceProvider.mute(isMicrophoneMuted)
  }

  func toggleOutputMute() async {
    isOutputMuted.toggle()
    await voiceProvider.muteOutput(isOutputMuted)
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

  func voiceProvider(
    _ voiceProvider: any VoiceProvidable, didProduceError error: VoiceProviderError
  ) {
    print("voiceProvider didProduceError:", error)
  }

  func voiceProvider(
    _ voiceProvider: any VoiceProvidable, didReceieveAudioInputMeter audioInputMeter: Float
  ) {
    //        print("voiceProvider didReceiveAudioInputMeter:", audioInputMeter)
  }

  func voiceProvider(
    _ voiceProvider: any VoiceProvidable, didReceieveAudioOutputMeter audioOutputMeter: Float
  ) {
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
