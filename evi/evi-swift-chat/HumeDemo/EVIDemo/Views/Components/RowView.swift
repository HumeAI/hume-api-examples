//
//  RowView.swift
//  HumeDemo
//
//  Created by Chris on 6/16/25.
//

import Hume
import SwiftUI

struct RowView<Content: View>: View {
    let title: String
    let content: () -> Content
    private let spacing: CGFloat = 12

    init(title: String, @ViewBuilder content: @escaping () -> Content) {
        self.title = title
        self.content = content
    }

    var body: some View {
        VStack(alignment: .leading, spacing: spacing) {
            HStack {
                Text(title)
                    .padding(.top, spacing / 2)
                    .font(.caption)
                Spacer()
            }
            content()
        }
        .padding(.horizontal, spacing)
        .padding(.bottom, spacing)
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.secondary, lineWidth: 1)
        )
    }
}




#Preview {
    RowView(title: "Preview Title") {
        VStack(alignment: .leading) {
            Text("Line 1")
            Text("Line 2")
        }
    }
    .padding()
}
