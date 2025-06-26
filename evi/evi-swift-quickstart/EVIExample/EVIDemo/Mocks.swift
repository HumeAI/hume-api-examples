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
        return AssistantMessage(customSessionId: "mock_session_id", fromText: false, id: "mock_id",
                                message: ChatMessage(content: "mock assistant message", role: .assistant, toolCall: nil, toolResult: nil),
                                models: .mock, type: "mock_type")
    }
}

// MARK: - AssistantEnd Mock
extension AssistantEnd: Mockable {
    public static var mock:  AssistantEnd {
        return AssistantEnd()
    }
}


// MARK: - Inference Mock
extension Inference: Mockable {
    public static var mock:  Inference {
        return Inference(prosody: ProsodyInference.mock)
    }
}

// MARK: - AudioInput Mock
extension AudioInput: Mockable {
    public static var mock:  AudioInput {
        return AudioInput(data: "mock_data", customSessionId: "mock_session_id")
    }
}

// MARK: - MillisecondInterval Mock
extension MillisecondInterval: Mockable {
    public static var mock:  MillisecondInterval {
        return MillisecondInterval(begin: 0, end: 1000)
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
        return ProsodyInference(scores: EmotionScores.mock)
    }
}

// MARK: - AssistantInput Mock
extension AssistantInput: Mockable {
    public static var mock:  AssistantInput {
        return AssistantInput(text: "mock_text", customSessionId: "mock_session_id")
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
        return AudioOutput(
            customSessionId: "mock_session_id",
            data: "mock_base64_data",
            index: 0,
            id: "mock_id",
            type: "mock_type"
        )
    }
}

// MARK: - ChatMetadata Mock
extension ChatMetadata: Mockable {
    public static var mock:  ChatMetadata {
        return ChatMetadata(
            chatGroupId: "mock_chat_group_id",
            chatId: "mock_chat_id",
            customSessionId: "mock_session_id",
            type: "mock_type"
        )
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
            customSessionId: "mock_session_id",
            audio: AudioConfiguration.mock,
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
        return ChatMessage(
            content: "mock_content",
            role: .assistant,
            toolCall: ToolCallMessage.mock,
            toolResult: .toolResponseMessage(ToolResponseMessage.mock)
        )
    }
}

extension Tool: Mockable {
    public static var mock: Tool {
        return Tool(
            type: .builtin,
            name: "mock_tool",
            parameters: "{}",
            description: "A mock tool for testing",
            fallbackContent: "Mock fallback content"
        )
    }
}

extension ToolCallMessage: Mockable {
    public static var mock: ToolCallMessage {
        return ToolCallMessage(
            name: "web_search",
            parameters: "{}",
            toolCallId: "mock_tool_call_id",
            toolType: .builtin,
            responseRequired: true,
            type: "mock_type",
            customSessionId: "mock_session_id"
        )
    }
}

extension ToolErrorMessage: Mockable {
    public static var mock: ToolErrorMessage {
        return ToolErrorMessage(
            type: "mock_error_type",
            toolCallId: "mock_tool_call_id",
            content: "Mock error content",
            error: "Mock error",
            customSessionId: "mock_session_id",
            code: "mock_code",
            level: "mock_level"
        )
    }
}

extension ToolResponseMessage: Mockable {
    public static var mock: ToolResponseMessage {
        return ToolResponseMessage(
            type: "mock_type",
            toolCallId: "mock_tool_call_id",
            content: "Mock response content",
            customSessionId: "mock_session_id"
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
        return UserInterruption(
            customSessionId: "mock_session_id",
            time: 100,
            type: "mock_type"
        )
    }
}

extension UserMessage: Mockable {
    public static var mock: UserMessage {
        return UserMessage(
            fromText: true,
            message: ChatMessage(content: "hellooo there", role: .user, toolCall: nil, toolResult: nil),
            models: Inference.mock,
            customSessionId: "mock_session_id",
            time: MillisecondInterval(begin: 0, end: 1000),
            type: "mock_type",
            interim: false
        )
    }
}

extension WebSocketError: Mockable {
    public static var mock: WebSocketError {
        return WebSocketError(
            code: "mock_code",
            customSessionId: "mock_session_id",
            message: "Mock error message",
            slug: "mock_slug",
            type: "mock_type"
        )
    }
}
