import os
import time
from datetime import datetime
import hashlib
import hmac
import json
import httpx
from starlette.datastructures import Headers
from hume.client import AsyncHumeClient
from hume.empathic_voice.types import ReturnChatEvent
from hume.empathic_voice import ToolCallMessage, ToolErrorMessage, ToolResponseMessage


async def fetch_all_chat_events(client: AsyncHumeClient, chat_id: str) -> list[ReturnChatEvent]:
    """Fetches all chat events for the given chat ID in chronological order."""
    all_chat_events: list[ReturnChatEvent] = []
    response = await client.empathic_voice.chats.list_chat_events(id=chat_id, page_number=0, ascending_order=True)
    async for event in response:
        all_chat_events.append(event)
    return all_chat_events


def construct_transcript(chat_events: list[ReturnChatEvent]) -> str:
    """Constructs a formatted transcript string from user and assistant messages."""
    relevant_events = [e for e in chat_events if e.type in ("USER_MESSAGE", "AGENT_MESSAGE")]

    lines: list[str] = []
    for event in relevant_events:
        role = "User" if event.role == "USER" else "Assistant"
        timestamp = event.timestamp
        dt = datetime.fromtimestamp(timestamp / 1000.0)
        readable_time = dt.strftime("%Y-%m-%d %H:%M:%S")
        lines.append(f"[{readable_time}] {role}: {event.message_text}")

    return "\n".join(lines)


def save_transcript_to_file(transcript: str, chat_id: str) -> None:
    """Saves the given transcript to a .txt file named by chat ID."""
    transcript_file_name = f"transcript_{chat_id}.txt"
    with open(transcript_file_name, "w", encoding="utf-8") as f:
        f.write(transcript)
    print(f"Transcript saved to {transcript_file_name}")


async def get_chat_transcript(client: AsyncHumeClient, chat_id: str) -> None:
    """Fetches chat events, generates a transcript, and saves it to a file."""
    chat_events = await fetch_all_chat_events(client, chat_id)
    transcript = construct_transcript(chat_events)
    save_transcript_to_file(transcript, chat_id)


def validate_webhook_headers(payload: str, headers: Headers) -> None:
    """
    Validates the HMAC signature and timestamp of an incoming webhook request.
    Ensures the request was sent by Hume and has not been tampered with or replayed.

    Args:
        payload: The raw request payload as a string.
        headers: The headers from the incoming request.

    Raises:
        ValueError: If headers are missing, the signature is invalid, or the timestamp is stale.
    """
    timestamp = headers.get("X-Hume-AI-Webhook-Timestamp")
    signature = headers.get("X-Hume-AI-Webhook-Signature")

    if not signature:
        raise ValueError("Missing HMAC signature")

    if not timestamp:
        raise ValueError("Missing timestamp")

    # Validate HMAC signature
    signing_key = os.environ.get("HUME_WEBHOOK_SIGNING_KEY")
    if not signing_key:
        raise ValueError("HUME_WEBHOOK_SIGNING_KEY is not set in environment variables")

    message = (payload + "." + timestamp).encode("utf-8")
    expected_sig = hmac.new(
        key=signing_key.encode("utf-8"),
        msg=message,
        digestmod=hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(signature, expected_sig):
        raise ValueError("Invalid HMAC signature")

    # Validate timestamp to prevent replay attacks
    try:
        timestamp_int = int(timestamp)
    except ValueError:
        raise ValueError("Invalid timestamp format")

    current_time = int(time.time())
    TIMESTAMP_VALIDATION_WINDOW = 180
    if current_time - timestamp_int > TIMESTAMP_VALIDATION_WINDOW:
        raise ValueError("The timestamp on the request is too old")


async def fetch_weather(parameters: str) -> str:
    """
    Fetches the weather forecast for a given location and temperature scale.

    Args:
        parameters: Stringified JSON with `location` and `format` fields.

    Returns:
        The JSON-formatted string of the weather forecast.
    """
    GEOCODING_API_KEY = os.getenv("GEOCODING_API_KEY")
    if not GEOCODING_API_KEY:
        return "ERROR: Geocoding API key is not set."

    tool_parameters = json.loads(parameters)
    location = tool_parameters.get('location')
    temp_scale = tool_parameters.get('format', 'text')

    location_api_url = f"https://geocode.maps.co/search?q={location}&api_key={GEOCODING_API_KEY}"

    async with httpx.AsyncClient(follow_redirects=True) as http_client:
        try:
            location_response = await http_client.get(location_api_url)
            location_response.raise_for_status()
            location_data = location_response.json()
        except httpx.HTTPError as e:
            return f"ERROR: Failed to fetch location data. {str(e)}"

        if not location_data:
            return "ERROR: No location data found."

        try:
            lat = location_data[0]['lat']
            lon = location_data[0]['lon']
        except (IndexError, KeyError):
            return "ERROR: Unable to extract latitude and longitude."

        point_metadata_endpoint = f"https://api.weather.gov/points/{float(lat):.4f},{float(lon):.4f}"

        try:
            point_metadata_response = await http_client.get(point_metadata_endpoint)
            point_metadata_response.raise_for_status()
            point_metadata = point_metadata_response.json()
        except httpx.HTTPError as e:
            return f"ERROR: Failed to fetch point metadata. {str(e)}"

        try:
            forecast_url = point_metadata['properties']['forecast']
        except KeyError:
            return "ERROR: Unable to extract forecast URL from point metadata."

        try:
            forecast_response = await http_client.get(forecast_url)
            forecast_response.raise_for_status()
            forecast_data = forecast_response.json()
        except httpx.HTTPError as e:
            return f"ERROR: Failed to fetch weather forecast. {str(e)}"

        try:
            periods = forecast_data['properties']['periods']
        except KeyError:
            return "ERROR: Unable to extract forecast periods."

        desired_unit = temp_scale.lower()
        if desired_unit not in ['fahrenheit', 'celsius']:
            return "ERROR: Invalid format specified. Please use 'fahrenheit' or 'celsius'."

        for period in periods:
            temperature = period.get('temperature')
            temperature_unit = period.get('temperatureUnit')

            if temperature is not None and temperature_unit is not None:
                if desired_unit == 'celsius' and temperature_unit == 'F':
                    period['temperature'] = round((temperature - 32) * 5 / 9)
                    period['temperatureUnit'] = 'C'
                elif desired_unit == 'fahrenheit' and temperature_unit == 'C':
                    period['temperature'] = round((temperature * 9 / 5) + 32)
                    period['temperatureUnit'] = 'F'

        return json.dumps(periods, indent=2)


async def fetch_weather_tool(
    client: AsyncHumeClient,
    chat_id: str,
    tool_call_message: ToolCallMessage,
) -> None:
    """
    Invokes the get_current_weather tool and sends the result back via the control plane.

    Args:
        client: The AsyncHumeClient instance.
        chat_id: The ID of the chat.
        tool_call_message: The tool call message.
    """
    parameters = tool_call_message.parameters
    tool_call_id = tool_call_message.tool_call_id
    tool_name = tool_call_message.name

    if tool_name != "get_current_weather":
        return

    try:
        current_weather = await fetch_weather(parameters)
        await client.empathic_voice.control_plane.send(
            chat_id=chat_id,
            request=ToolResponseMessage(
                tool_call_id=tool_call_id,
                content=current_weather,
            ),
        )
    except Exception as e:
        print(f"Error fetching weather: {e}")
        await client.empathic_voice.control_plane.send(
            chat_id=chat_id,
            request=ToolErrorMessage(
                tool_call_id=tool_call_id,
                error="WeatherFetchError",
                content=str(e),
            ),
        )
