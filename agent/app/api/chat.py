"""POST /api/chat — SSE stream các event chat."""

import json

from fastapi import APIRouter, Header, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core import rate_limit

router = APIRouter()

SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: str | None = None
    image: str | None = None  # data URL base64 (tùy chọn) — tìm sản phẩm bằng ảnh (§9.4)
    # Đường dẫn trang khách đang mở (vd /products/ong-nhua-pvc-d21) — agent hiểu "sản phẩm này"
    page: str | None = None


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@router.post("/api/chat")
async def chat(
    request: Request,
    body: ChatRequest,
    x_chat_user: str = Header(..., alias="X-Chat-User"),
):
    chat_service = request.app.state.chat_service

    # ── CHỐNG SPAM (bảo vệ chi phí API): chặn TRƯỚC khi gọi LLM ──
    ip = rate_limit.client_ip(request)
    allowed, reason = rate_limit.check(ip)
    if not allowed:
        async def blocked_stream():
            yield _sse({"type": "error", "message": reason})

        return StreamingResponse(blocked_stream(), media_type="text/event-stream", headers=SSE_HEADERS)
    rate_limit.record(ip)  # tính lượt vì chắc chắn sẽ chạy LLM

    async def event_stream():
        async for event in chat_service.stream_chat(
            user_id=x_chat_user,
            message=body.message,
            conversation_id=body.conversation_id,
            image=body.image,
            page=body.page,
        ):
            yield _sse(event)

    return StreamingResponse(
        event_stream(), media_type="text/event-stream", headers=SSE_HEADERS
    )
