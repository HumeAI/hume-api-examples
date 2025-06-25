//
//  ContentView.swift
//  HumeDemo
//
//  Created by Daniel Rees on 5/18/24.
//

import SwiftUI



struct ContentView: View {
    
    @State private var showEviChatView = false
    
    
    
    var body: some View {
        if showEviChatView {
            EVIChatView()
            
        } else {
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
                    showEviChatView = true
                }
                                
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding()
        }
        
        
    }
}

#Preview {
    ContentView()
}
