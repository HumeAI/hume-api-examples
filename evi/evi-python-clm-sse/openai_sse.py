from typing import AsyncIterable, Optional
import fastapi
from fastapi.responses import StreamingResponse
from openai.types.chat import ChatCompletionChunk, ChatCompletionMessageParam
import openai
import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

app = fastapi.FastAPI()
"""
This would be the server that Hume would send requests to, that would then 
get streamed back to us.

uvicorn openai_sse:app --reload
"""

client = openai.AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])


async def get_response(
    raw_messages: list[dict],
    custom_session_id: Optional[str],
) -> AsyncIterable[str]:
    """
    Stream a response from OpenAI back to Hume.
    """
    messages: list[ChatCompletionMessageParam] = [
        {"role": m["role"], "content": m["content"]} for m in raw_messages
    ]

    chat_completion_chunk_stream = await client.chat.completions.create(
        messages=messages,
        model="gpt-4o",
        stream=True,
    )

    async for chunk in chat_completion_chunk_stream:
        yield "data: " + chunk.model_dump_json(exclude_none=True) + "\n\n"
    yield "data: [DONE]\n\n"


security = HTTPBearer()
API_KEY = "your-secret-key-here"  # In production, use environment variables


async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    if credentials.credentials != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    return credentials.credentials


@app.post("/chat/completions", response_class=StreamingResponse)
async def root(
    request: fastapi.Request,
    # token: str = Security(verify_token)
):
    """Chat completions endpoint with Bearer token authentication"""
    request_json = await request.json()
    messages = request_json["messages"]
    print(messages)

    custom_session_id = request.query_params.get("custom_session_id")
    print(custom_session_id)

    return StreamingResponse(
        get_response(messages, custom_session_id=custom_session_id),
        media_type="text/event-stream",
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
