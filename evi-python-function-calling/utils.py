import datetime

def print_prompt(text: str) -> None:
    """Print a formatted message with a timestamp."""
    now = datetime.datetime.now(tz=datetime.timezone.utc)
    now_str = now.strftime("%H:%M:%S")
    print(f"[{now_str}] {text}")

def extract_top_n_emotions(emotion_scores: dict, n: int) -> dict:
    """Extract the top N emotions based on confidence scores."""
    sorted_emotions = sorted(emotion_scores.items(), key=lambda item: item[1], reverse=True)
    return {emotion: score for emotion, score in sorted_emotions[:n]}

def print_emotion_scores(emotion_scores: dict) -> None:
    """Print the emotions and their scores in a formatted, single-line manner."""
    formatted_emotions = ' | '.join([f"{emotion} ({score:.2f})" for emotion, score in emotion_scores.items()])
    print(f"|{formatted_emotions}|")