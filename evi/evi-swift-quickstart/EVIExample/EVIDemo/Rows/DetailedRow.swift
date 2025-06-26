//
//  DetailedRow.swift
//  EVIExample
//
//  Created by Chris on 6/17/25.
//


import SwiftUI

struct DetailedRow: View {
    let data: [String: String]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(data.sorted(by: { $0.key < $1.key }), id: \.key) { key, value in
                HStack {
                    Text("\(key):").font(.body.bold())
                    Text(value).font(.body)
                }
            }
        }
    }
}

extension Encodable {
    /// Converts any Encodable type to [String: String] using JSONSerialization.
    func asStringDictionary() -> [String: String] {
        guard let data = try? JSONEncoder().encode(self) else { return [:] }
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return [:] }
        var result: [String: String] = [:]
        for (key, value) in json {
            // Handle optional, array, nested, etc. as desired:
            result[key] = String(describing: value)
        }
        return result
    }
}
