//
//  HumeDemoApp.swift
//  HumeDemo
//
//  Created by Daniel Rees on 5/18/24.
//

import SwiftUI
import Hume

@main
struct HumeDemoApp: App {
    
    // MARK: App State
    @State private var isInitializing = true
    @State private var failedInitialization = false
    
    // MARK: Clients
    @State private var humeClient: HumeClient!
    private let accessTokenClient: AccessTokenClient
    
    init() {
        let envHost = ProcessInfo.processInfo.environment["ACCESS_TOKEN_HOST"]
        let envPort = ProcessInfo.processInfo.environment["ACCESS_TOKEN_PORT"]
        let host = envHost ?? "localhost"
        let port = envPort ?? "8000"
        self.accessTokenClient = AccessTokenClient(host: host, port: Int(port) ?? 8000)
    }
    
    var body: some Scene {
        WindowGroup {
            if isInitializing {
                VStack {
                    Spacer()
                    ProgressView("Initializing...")
                        .progressViewStyle(CircularProgressViewStyle())
                        .padding()
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .task {
                    await initialize()
                }
            } else if failedInitialization {
                VStack {
                    Spacer()
                    Text("Failed to initialize Hume Client. Did you start access_token_service/run_token_service.py?")
                        .foregroundColor(.red)
                        .padding()
                    Button("Retry") {
                        isInitializing = true
                        failedInitialization = false
                        Task {
                            await initialize()
                        }
                    }
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                TTSView()
                    .environmentObject(TTSModel(tts: humeClient.tts.tts))
            }
        }
    }
    
    // MARK: - Helpers
    
    private func initialize() async {
        do {
            let token = try await accessTokenClient.fetchAccessToken().accessToken
            humeClient = HumeClient(options: .accessToken(token: token))
            isInitializing = false
        } catch {
            print("Failed to fetch access token: \(error)")
            failedInitialization = true
            isInitializing = false
        }
    }
}
