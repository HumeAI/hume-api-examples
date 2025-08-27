//
//  Mocks.swift
//
//
//  Created by ChatGPT on 12/23/24.
//

import Foundation
import SwiftUI
import Hume

protocol Mockable {
    static var mock: Self { get }
}


extension AssistantMessage: Mockable {
    public static var mock:  AssistantMessage {
        let dict: [String: Any] = [
            "customSessionId": "mock_session_id",
            "fromText": false,
            "id": "mock_id",
            "message": [
                "content": "mock assistant message",
                "role": "assistant"
            ],
            "models": [
                "prosody": [
                    "scores": EmotionScores.mock
                ]
            ],
            "type": "assistant_message"
        ]
        return try! dict.as(AssistantMessage.self)
    }
}

// MARK: - AssistantEnd Mock
extension AssistantEnd: Mockable {
    public static var mock:  AssistantEnd {
        let dict: [String: Any] = [
            "customSessionId": "mock_session_id",
            "type": "assistant_end"
        ]
        return try! dict.as(AssistantEnd.self)
    }
}


// MARK: - Inference Mock
extension Inference: Mockable {
    public static var mock:  Inference {
        let dict: [String: Any] = [
            "prosody": [
                "scores": EmotionScores.mock
            ]
        ]
        return try! dict.as(Inference.self)
    }
}

// MARK: - AudioInput Mock
extension AudioInput: Mockable {
    public static var mock:  AudioInput {
        return AudioInput(customSessionId: "mock_session_id", data: "mock_data")
    }
}

// MARK: - MillisecondInterval Mock
extension MillisecondInterval: Mockable {
    public static var mock:  MillisecondInterval {
        let dict: [String: Any] = [
            "begin": 0,
            "end": 1000
        ]
        return try! dict.as(MillisecondInterval.self)
    }
}

// MARK: - PauseAssistantMessage Mock
extension PauseAssistantMessage: Mockable {
    public static var mock:  PauseAssistantMessage {
        return PauseAssistantMessage(customSessionId: "mock_session_id")
    }
}

// MARK: - ProsodyInference Mock
extension ProsodyInference: Mockable {
    public static var mock:  ProsodyInference {
        let dict: [String: Any] = [
            "scores": EmotionScores.mock
        ]
        return try! dict.as(ProsodyInference.self)
    }
}

// MARK: - AssistantInput Mock
extension AssistantInput: Mockable {
    public static var mock:  AssistantInput {
        let dict: [String: Any] = ["text": "mock_text", "type": "assistant_input"]
        return try! dict.as(AssistantInput.self)
    }
}

// MARK: - EmotionScores Mock
extension EmotionScores: Mockable {
    public static var mock: EmotionScores {
        return [
            "admiration": 0.1, "adoration": 0.1, "aestheticAppreciation": 0.1, "amusement": 0.1, "anger": 0.1,
            "anxiety": 0.1, "awe": 0.1, "awkwardness": 0.1, "boredom": 0.1, "calmness": 0.1, "concentration": 0.1,
            "confusion": 0.1, "contemplation": 0.1, "contempt": 0.1, "contentment": 0.1, "craving": 0.1,
            "desire": 0.1, "determination": 0.1, "disappointment": 0.1, "disgust": 0.1, "distress": 0.1,
            "doubt": 0.1, "ecstasy": 0.1, "embarrassment": 0.1, "empathicPain": 0.1, "entrancement": 0.1,
            "envy": 0.1, "excitement": 0.1, "fear": 0.1, "guilt": 0.1, "horror": 0.1, "interest": 0.1,
            "joy": 0.1, "love": 0.1, "nostalgia": 0.1, "pain": 0.1, "pride": 0.1, "realization": 0.1,
            "relief": 0.1, "romance": 0.1, "sadness": 0.1, "satisfaction": 0.1, "shame": 0.1,
            "surpriseNegative": 0.1, "surprisePositive": 0.1, "sympathy": 0.1, "tiredness": 0.1, "triumph": 0.1
        ]
    }
}

// MARK: - AudioOutput Mock
extension AudioOutput: Mockable {
    public static var mock:  AudioOutput {
        let dict: [String: Any] = [
            "customSessionId": "mock_session_id",
            "data": "mock_base64_data",
            "index": 0,
            "id": "mock_id",
            "type": "audio_output"
        ]
        return try! dict.as(AudioOutput.self)
    }
}

// MARK: - ChatMetadata Mock
extension ChatMetadata: Mockable {
    public static var mock:  ChatMetadata {
        let dict: [String: Any] = [
            "chatGroupId": "mock_chat_group_id",
            "chatId": "mock_chat_id",
            "customSessionId": "mock_session_id",
            "type": "chat_metadata"
        ]
        return try! dict.as(ChatMetadata.self)
    }
}

// MARK: - ResumeAssistantMessage Mock
extension ResumeAssistantMessage: Mockable {
    public static var mock:  ResumeAssistantMessage {
        return ResumeAssistantMessage(customSessionId: "mock_session_id")
    }
}

// MARK: - SessionSettings Mock
extension SessionSettings: Mockable {
    public static var mock:  SessionSettings {
        return SessionSettings(
            audio: AudioConfiguration.mock,
            builtinTools: nil,
            context: nil,
            customSessionId: "mock_session_id",
            languageModelApiKey: "mock_api_key",
            systemPrompt: "mock_system_prompt",
            tools: [Tool.mock],
            variables: ["mock_key": "mock_value"]
        )
    }
}

// MARK: - AudioConfiguration Mock
extension AudioConfiguration: Mockable {
    public static var mock:  AudioConfiguration {
        return AudioConfiguration(
            channels: 2,
            encoding: .linear16,
            sampleRate: 44100
        )
    }
}

// MARK: - ChatMessage Mock
extension ChatMessage: Mockable {
    public static var mock:  ChatMessage {
        let dict: [String: Any] = [
            "content": "mock_content",
            "role": "assistant",
            "toolCall": [
                "name": "web_search",
                "parameters": "{}",
                "responseRequired": true,
                "toolCallId": "mock_tool_call_id",
                "toolType": "builtin",
                "customSessionId": "mock_session_id",
                "type": "tool_call_message"
            ],
            "toolResult": [
                "content": "Mock response content",
                "customSessionId": "mock_session_id",
                "toolCallId": "mock_tool_call_id",
                "toolName": "web_search",
                "toolType": "builtin",
                "type": "tool_response"
            ]
        ]
        return try! dict.as(ChatMessage.self)
    }
}

extension Tool: Mockable {
    public static var mock: Tool {
        return Tool(
            description: "A mock tool for testing",
            fallbackContent: "Mock fallback content",
            name: "mock_tool",
            parameters: "{}",
            type: .builtin
        )
    }
}

extension ToolCallMessage: Mockable {
    public static var mock: ToolCallMessage {
        let dict: [String: Any] = [
            "name": "web_search",
            "parameters": "{}",
            "toolCallId": "mock_tool_call_id",
            "toolType": "builtin",
            "responseRequired": true,
            "type": "tool_call_message",
            "customSessionId": "mock_session_id"
        ]
        return try! dict.as(ToolCallMessage.self)
    }
}

extension ToolErrorMessage: Mockable {
    public static var mock: ToolErrorMessage {
        return ToolErrorMessage(
            code: "mock_code",
            content: "Mock error content",
            customSessionId: "mock_session_id",
            error: "Mock error",
            level: .warn,
            toolCallId: "mock_tool_call_id",
            toolType: .builtin
        )
    }
}

extension ToolResponseMessage: Mockable {
    public static var mock: ToolResponseMessage {
        return ToolResponseMessage(
            content: "Mock response content",
            customSessionId: "mock_session_id",
            toolCallId: "mock_tool_call_id",
            toolName: "web_search",
            toolType: .builtin
        )
    }
}

// Enums typically don't need to conform to Mockable, as they are static by nature.

extension UserInput: Mockable {
    public static var mock: UserInput {
        return UserInput(
            customSessionId: "mock_session_id",
            text: "Mock user input"
        )
    }
}

extension UserInterruption: Mockable {
    public static var mock: UserInterruption {
        let dict: [String: Any] = [
            "customSessionId": "mock_session_id",
            "time": [
                "begin": 0,
                "end": 100
            ],
            "type": "user_interruption"
        ]
        return try! dict.as(UserInterruption.self)
    }
}

extension UserMessage: Mockable {
    public static var mock: UserMessage {
        let dict: [String: Any] = [
            "customSessionId": "mock_session_id",
            "fromText": true,
            "interim": false,
            "message": [
                "content": "hellooo there",
                "role": "user"
            ],
            "models": [
                "prosody": [
                    "scores": EmotionScores.mock
                ]
            ],
            "time": [
                "begin": 0,
                "end": 1000
            ],
            "type": "user_message"
        ]
        return try! dict.as(UserMessage.self)
    }
}

extension WebSocketError: Mockable {
    public static var mock: WebSocketError {
        let dict: [String: Any] = [
            "code": "mock_code",
            "customSessionId": "mock_session_id",
            "message": "Mock error message",
            "slug": "mock_slug",
            "type": "websocket_error"
        ]
        return try! dict.as(WebSocketError.self)
    }
}
