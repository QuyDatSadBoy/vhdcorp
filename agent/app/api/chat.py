"""POST /api/chat — SSE stream các event chat."""

import json

from fastapi import APIRouter, Header, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter()

SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    conversation_id: str | None = None
    image: str | None = None  # data URL base64 (tùy chọn) — tìm sản phẩm bằng ảnh (§9.4)


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@router.post("/api/chat")
async def chat(
    request: Request,
    body: ChatRequest,
    x_chat_user: str = Header(..., alias="X-Chat-User"),
):
    chat_service = request.app.state.chat_service

    async def event_stream():
        async for event in chat_service.stream_chat(
            user_id=x_chat_user,
            message=body.message,
            conversation_id=body.conversation_id,
            image=body.image,
        ):
            yield _sse(event)

    return StreamingResponse(
        event_stream(), media_type="text/event-stream", headers=SSE_HEADERS
    )
