//
//  TTSEvent.swift
//  HumeDemo
//
//  Created by Chris on 6/26/25.
//

import Foundation
import Hume

enum TTSEvent: Hashable {
    case error(String)
    case json(JSON)
    case file(File)
    case streamStart
    case streamEnd
    
    var title: String {
        switch self {
        case .error(_): "Error"
        case .json(let event): event.returnTts.requestId ?? "No Request ID"
        case .file(_): "File"
        case .streamStart: "Stream Start"
        case .streamEnd: "Stream End"
        }
    }
    
    struct JSON: Hashable {
        let postedTts: PostedTts
        let returnTts: ReturnTts
    }

    struct File: Hashable {
        let postedTts: PostedTts
        let data: Data
    }

}
