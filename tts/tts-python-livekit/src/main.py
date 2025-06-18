#!/usr/bin/env python3
"""
Entrypoint for the Hume+LiveKit TTS example.
"""
import argparse
import asyncio
import sys

from agent_session import agent_session
from constants import WORKFLOWS
from standalone_tts import standalone_tts
from utils import validate_env_vars

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Hume+LiveKit TTS example")
    parser.add_argument("--mode", choices=list(WORKFLOWS), default="standalone")
    return parser.parse_args()

def main() -> None:
    """Validate environment variables and invoke the selected TTS workflow."""
    args = parse_args()

    try:
        validate_env_vars(WORKFLOWS[args.mode])
    except RuntimeError as err:
        print(f"ERROR: {err}", file=sys.stderr)
        sys.exit(1)

    if args.mode == "agent":
        agent_session()
    else:
        standalone_tts()

if __name__ == "__main__":
    main()