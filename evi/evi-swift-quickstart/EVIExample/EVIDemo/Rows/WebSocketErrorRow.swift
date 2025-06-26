//
//  WebSocketErrorRow.swift
//  EVIExample
//
//  Created by Daniel Rees on 5/23/24.
//

import SwiftUI
import Hume

struct WebSocketErrorRow: View {
    
    let resource: WebSocketError
    
    var body: some View {
        Text("WebSocket Error - \(resource.slug) - \(resource.code) - \(resource.message)" )
    }
}

