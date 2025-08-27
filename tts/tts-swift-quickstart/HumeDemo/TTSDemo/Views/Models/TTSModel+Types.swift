//
//  OutputFormat.swift
//  HumeDemo
//
//  Created by Chris on 8/27/25.
//

import Foundation
import Hume

extension TTSModel {
    enum OutputFormat: String, CaseIterable, Identifiable {
        case wav
        case mp3
        case pcm

        var id: String { rawValue }

        var asHumeFormat: Format {
            switch self {
            case .wav: return .wav(FormatWav())
            case .mp3: return .mp3(FormatMp3())
            case .pcm: return .pcm(FormatPcm())
            }
        }
    }
    enum TTSType: String, CaseIterable, Identifiable {
        var id: String { rawValue }
        
        case json
        case file
    }
    
    enum TTSMode: String, CaseIterable, Identifiable {
        var id: String { rawValue }
        
        case synchronous
        case stream
    }

}
