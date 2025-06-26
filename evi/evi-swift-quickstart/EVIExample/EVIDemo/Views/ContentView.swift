//
//  ContentView.swift
//  EVIExample
//
//  Created by Daniel Rees on 5/18/24.
//

import SwiftUI



struct ContentView: View {
    enum VisibleView: String, CaseIterable {
        case intro
        case chat
        case tts
    }
    
    @EnvironmentObject var chatModel: EVIChatModel
    
    @State private var visibleView: VisibleView = .intro {
        didSet {
            /// Stop the voice provider when switching views
            if chatModel.connectionState == .connected {
                Task {
                    await chatModel.stopVoiceProvider()
                }
            }
        }
    }
    @State private var showMenu = false

    var body: some View {
            VStack {
                if visibleView != .intro {
                    menuView
                        .fixedSize(horizontal: false, vertical: true)
                }
                
                ZStack(alignment: .leading) {
                
                Group {
                    switch visibleView {
                    case .intro:
                        introView
                    case .chat:
                        EVIChatView()
                    case .tts:
                        EmptyView()
                    }
                }
                .disabled(showMenu)
                .opacity(showMenu ? 0.5 : 1.0)
                .frame(maxHeight: .infinity)
                
                if showMenu {
                    sideMenu
                        .transition(.move(edge: .leading))
                }
            }
            

        }
        
    }
    
    // MARK: - Views
    
    private var menuView: some View {
        VStack {
            HStack {
                Button(action: { withAnimation { showMenu.toggle() } }) {
                    Image(systemName: "line.horizontal.3")
                        .font(.title)
                }
                Spacer()
            }
        }
        .padding(.horizontal)
    }
    
    private var introView: some View {
        VStack {
            Spacer()
            Image(.logo)
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 200)
            Text("Demo SDK Version: 0.1.0")
                .font(.footnote)
                .padding(.vertical, 10)
            Spacer()
            Button("Get Started") {
                withAnimation {
                    visibleView = .chat
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }

    // MARK: - Menu
    private var sideMenu: some View {
            GeometryReader { geo in
                ZStack(alignment: .trailing) {
                    Rectangle()
                        .fill(Color.primary.opacity(0.5))
                        .frame(width: 1, height: geo.size.height)
                        .shadow(radius: 2, x: 2)
                    
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(VisibleView.allCases, id: \.rawValue) { view in
                            Button {
                                withAnimation {
                                    visibleView = view
                                    showMenu = false
                                }
                            } label: {
                                Text(view.rawValue.capitalized)
                                    .foregroundStyle(Color.primary)
                                    .padding(.horizontal, 24)
                                    .frame(maxWidth: .infinity, maxHeight: 96, alignment: .leading)
                            }
                            .background(visibleView == view ? Color.accentColor.opacity(0.3) : Color.clear)
                            .contentShape(Rectangle())
                            
                            Divider()
                        }
                        Spacer()
                    }
                }
                .frame(width: geo.size.width / 3)
                .background(Color(.systemBackground))
            }
        }

}

#Preview {
    ContentView()
        .environmentObject(EVIChatModel.makeForPreview())
}
