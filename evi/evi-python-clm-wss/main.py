from fastapi import FastAPI, WebSocket
import json
import random
from typing import TypedDict, Dict, List, Tuple, Optional

app = FastAPI()

ProsodyScores = Dict[str, float]


class ProsodyModel(TypedDict):
    scores: ProsodyScores


class MessageContent(TypedDict):
    role: str
    content: str


Models = TypedDict("Models", {
    "prosody": ProsodyModel
})
class HumeMessage(TypedDict):
    message: MessageContent
    models: Models


class MessagesPayload(TypedDict):
    messages: List[HumeMessage]


class ChatHistoryItem(TypedDict):
    role: str
    content: str

class Agent:
    """
    This is a simple "Eliza" agent that returns vague randomly-chosen responses that might seem relevant.

    In most real applications, you would actually want to call a language model to produce a response.

    However this example shows
      * How to parse the incoming messages from Hume.
      * How to extract the prosody (emotional expression measures) provided by Hume.
      * How to look into the chat history and use it to produce a response.
    """
    def __init__(self):
        self.eliza_responses = [
            "Tell me more about that.",
            "How does that make you feel?",
            "How long have you felt this way?",
        ]
    
    def _extract_prosody_scores(self, message: HumeMessage) -> ProsodyScores:
        return message.get("models", {}).get("prosody", {}).get("scores", {})

    def _get_top_prosody_scores(self, prosody_scores: ProsodyScores, count: int = 3) -> ProsodyScores:
        sorted_entries = sorted(prosody_scores.items(), key=lambda x: x[1], reverse=True)
        return {entry[0]: entry[1] for entry in sorted_entries[:count]}

    def _prosody_report(self, prosody_scores: ProsodyScores) -> str:
        # Get top 2 emotions
        sorted_emotions = sorted(prosody_scores.items(), key=lambda x: x[1], reverse=True)
        emotion1, score1 = sorted_emotions[0]
        emotion2, score2 = sorted_emotions[1]
        return f"you are feeling a lot of {emotion1} and {emotion2}"

    def _count_messages_by_role(self, chat_history: List[ChatHistoryItem]) -> Tuple[int, int]:
        user_count = sum(1 for msg in chat_history if msg["role"] == "user")
        assistant_count = sum(1 for msg in chat_history if msg["role"] == "assistant")
        return user_count, assistant_count

    def parse_hume_payload(self, messages_payload: MessagesPayload) -> Tuple[str, List[ChatHistoryItem], ProsodyScores]:
        messages = messages_payload["messages"]
        last_user_message = messages[-1]["message"]["content"]

        # Extract prosody scores from the last user message
        last_message = messages[-1]
        last_prosody_scores = self._extract_prosody_scores(last_message)
        last_user_prosody = self._get_top_prosody_scores(last_prosody_scores)
        
        chat_history: List[ChatHistoryItem] = []
        
        for message in messages[:-1]:
            message_object = message["message"]
            prosody_scores = self._extract_prosody_scores(message)
            top_prosody = self._get_top_prosody_scores(prosody_scores)
            
            contextualized_utterance = self.add_prosody_to_utterance(
                message_object["content"], top_prosody
            )
            
            chat_history.append({
                "role": message_object["role"],
                "content": contextualized_utterance
            })
        
        return last_user_message, chat_history, last_user_prosody
    
    def add_prosody_to_utterance(self, content: str, prosody_scores: ProsodyScores) -> str:
        if prosody_scores:
            prosody_report = self._prosody_report(prosody_scores)
            return f"{content} [Prosody: {prosody_report}]"
        return content
    
    def _generate_eliza_response(self) -> str:
        return random.choice(self.eliza_responses)
    
    def _should_send_congratulations(self, user_count: int, assistant_count: int) -> bool:
        total_messages = (user_count + 1) + (assistant_count + 1)
        return total_messages % 10 == 0
    
    def respond(self, message: str, chat_history: List[ChatHistoryItem], last_user_prosody: ProsodyScores) -> List[str]:
        user_count, assistant_count = self._count_messages_by_role(chat_history)
        
        eliza_response = self._generate_eliza_response()
        
        if self._should_send_congratulations(user_count, assistant_count):
            final_user_count = user_count + 1
            final_assistant_count = assistant_count + 1
            
            prosody_info = ""
            if last_user_prosody:
                prosody_report = self._prosody_report(last_user_prosody)
                prosody_info = f" {prosody_report}."
            
            congrats_text = f" Congratulations, we have sent {final_user_count} user messages and {final_assistant_count} assistant messages.{prosody_info}"
            eliza_response += congrats_text
        
        return [eliza_response]

@app.websocket("/llm")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    agent = Agent()

    while True:
        data = await websocket.receive_text()
        hume_socket_message = json.loads(data)
        message, chat_history, last_user_prosody = agent.parse_hume_payload(hume_socket_message)

        print(message)
        print(chat_history)

        responses = agent.respond(message, chat_history, last_user_prosody)

        print(responses)

        for response in responses:
            await websocket.send_text(response)
