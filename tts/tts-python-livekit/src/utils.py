"""
Shared utilities
"""
import os
import sys

from dotenv import load_dotenv

def validate_env_vars(env_vars: list[str]) -> None:
    """
    Load environment variables from .env, then ensure all required variables are set.
    If any are missing, raise a RuntimeError with a helpful message pointing to .env.example.
    """
    # Load from .env into environment
    load_dotenv(override=True)

    # Check which vars are missing
    missing = [var for var in env_vars if os.getenv(var) is None]
    if missing:
        raise RuntimeError(
            "Missing required environment variables: "
            + ", ".join(missing)
            + "\n\nPlease create a .env file in the project root "
            + "based on .env.example and fill in the values:\n\n"
            + "\n".join(f"  {var}=" for var in missing)
        )
