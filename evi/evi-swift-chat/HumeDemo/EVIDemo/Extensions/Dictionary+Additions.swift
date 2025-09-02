//
//  Dictionary+Additions.swift
//  HumeDemo
//
//  Created by Chris on 8/21/25.
//

import Foundation

extension Dictionary where Key == String, Value == Any {
    enum DictionaryDecodingError: Error, LocalizedError {
        case invalidJSONObject
        case encodingFailed
        case decodingFailed(underlying: Error)

        var errorDescription: String? {
            switch self {
            case .invalidJSONObject:
                return "Dictionary is not a valid JSON object"
            case .encodingFailed:
                return "Failed to encode dictionary to JSON data"
            case .decodingFailed(let underlying):
                return "Failed to decode JSON into model: \(underlying.localizedDescription)"
            }
        }
    }

    /// Converts a `[String: Any]` dictionary into a Codable type via JSON serialization.
    /// - Parameters:
    ///   - type: The target `Codable` type.
    ///   - decoder: Optional `JSONDecoder` (defaults to a plain instance).
    /// - Returns: An instance of the requested Codable type.
    /// - Throws: `DictionaryDecodingError` if encoding/decoding fails.
    func `as`<T: Codable>(_ type: T.Type, decoder: JSONDecoder = JSONDecoder()) throws -> T {
        guard JSONSerialization.isValidJSONObject(self) else {
            throw DictionaryDecodingError.invalidJSONObject
        }
        let data: Data
        do {
            data = try JSONSerialization.data(withJSONObject: self, options: [])
        } catch {
            throw DictionaryDecodingError.encodingFailed
        }
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw DictionaryDecodingError.decodingFailed(underlying: error)
        }
    }
}
