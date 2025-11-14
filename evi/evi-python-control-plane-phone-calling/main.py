import os
from hume import HumeClient
from dotenv import load_dotenv

load_dotenv()

HUME_API_KEY = os.getenv("HUME_API_KEY")
HUME_CONFIG_ID = os.getenv("HUME_CONFIG_ID")

if not HUME_API_KEY:
    raise ValueError("HUME_API_KEY environment variable is required")
if not HUME_CONFIG_ID:
    raise ValueError("HUME_CONFIG_ID environment variable is required")

client = HumeClient(api_key=HUME_API_KEY)


def evi_get_active_chats():
    # List EVI chats
    response = client.empathic_voice.chats.list_chats(
        page_number=0,
        page_size=1,
        ascending_order=True,
        config_id=HUME_CONFIG_ID,  # Filter by config_id
    )

    # Find the first active chat
    # If you have multiple active chats for the same config, please change this to adapt
    for item in response:
        if hasattr(item, "status") and item.status == "ACTIVE":
            return item

    return None


def main():
    try:
        active_chat = evi_get_active_chats()

        if active_chat:
            print(f"Found active chat with ID: {active_chat.id}")
        else:
            print("No active chats found")
    except ValueError as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
