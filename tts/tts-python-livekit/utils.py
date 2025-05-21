"""
Utility functions for the LiveKit Agents demo.
"""

import os
import sys

# third-party
from dotenv import load_dotenv


# Environment variables required to run the demo
REQUIRED_ENV_VARS = [
    "HUME_API_KEY",
    "GROQ_API_KEY",
    "ANTHROPIC_API_KEY",
    "LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
]


def validate_env_vars():
    """
    Load environment variables from .env, then ensure all REQUIRED_ENV_VARS are set.
    If any are missing, exit with a helpful message pointing to the .env.example file.
    """
    # Load from .env into environment
    load_dotenv(override=True)

    # Check which vars are missing
    missing = [var for var in REQUIRED_ENV_VARS if not os.getenv(var)]
    if missing:
        example_filename = ".env.example"
        message = (
            "\nERROR: Missing environment variables: "
            + ", ".join(missing)
            + "\n\nPlease create a .env file in the project root "
            + f"based on {example_filename} and fill in the values:\n\n"
            + "\n".join(f"  {var}=" for var in REQUIRED_ENV_VARS)
            + "\n"
        )
        sys.exit(message)