import os
import sys

from dotenv import load_dotenv


def validate_env_vars(env_vars: [str]):
    """
    Load environment variables from .env, then ensure all required environment variables are set.
    If any are missing, exit with a helpful message pointing to the .env.example file.
    """
    # Load from .env into environment
    load_dotenv(override=True)

    # Check which vars are missing
    missing = [var for var in env_vars if not os.getenv(var)]
    if missing:
        message = (
            "\nERROR: Missing environment variables: "
            + ", ".join(missing)
            + "\n\nPlease create a .env file in the project root "
            + f"based on .env.example and fill in the values:\n\n"
            + "\n".join(f"  {var}=" for var in env_vars)
            + "\n"
        )
        sys.exit(message)