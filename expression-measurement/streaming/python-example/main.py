#!/usr/bin/env python3
"""
Simple Hume Expression Measurement Streaming API example using the language model.
This example takes text input from stdin and outputs emotion summaries to stdout.
"""

import asyncio
import os
import sys
from typing import Dict, List, Tuple, TypedDict, cast
from dotenv import load_dotenv

from hume.legacy import HumeStreamClient
from hume.legacy.models.config import LanguageConfig

load_dotenv()

API_KEY = cast(str, os.getenv("HUME_API_KEY"))
if not API_KEY:
    print("Error: HUME_API_KEY environment variable not set")
    print("Please create a .env file with your API key")
    sys.exit(1)

class Result(TypedDict):
    text: str | None
    scores: List[Tuple[str, float]]

def process_emotion_scores(event: Dict) -> List[Result]:
    if event['language'] is None or event['language']['predictions'] is None or len(event['language']['predictions']) == 0:
        raise ValueError("Unexpected: event does not contain language data")

    ret: List[Result] = []
    for prediction in event['language']['predictions']:
        ret.append({
            "scores": sorted(
              [(item['name'], item['score']) for item in prediction['emotions'] or [] if item['name'] and item['score'] is not None],
              key=lambda x: x[1],
              reverse=True),
            "text": prediction['text'],
        })
    return ret

def print_emotion_summary(result: Result) -> None:
    if not result:
        print("No emotions detected")
        return
    
    print("\nEmotion Analysis:")
    print("-" * 40)
    for emotion, score in result['scores'][:5]:  # Show top 5 emotions
        print(f"{emotion.ljust(15)}: {score:.4f}")
    print("-" * 40)

async def streaming_example() -> None:
    """Main function to run the streaming example"""
    client = HumeStreamClient(api_key=API_KEY)
    
    language_config = LanguageConfig(granularity="sentence")
    configs = [language_config]
    
    print("Hume Language Emotion Streaming Example")
    print("-" * 60)
    
    async with client.connect(
        configs
    ) as socket:
        print("\nEnter text and press Enter to analyze emotions")
        
        while True:
            try:
                # Get user input
                text = input("\nType 'exit' to quit\n> ")
                if text.lower() == 'exit':
                    break
                
                if not text.strip():
                    continue
                
                response = await socket.send_text(text=text)
                
                results = process_emotion_scores(response)
                for result in results:
                    print_emotion_summary(result)
                
            except KeyboardInterrupt:
                print("\nExiting...")
                break

def main():
    """Entry point for the script"""
    try:
        asyncio.run(streaming_example())
    except KeyboardInterrupt:
        print("\nExiting...")

if __name__ == "__main__":
    main()
