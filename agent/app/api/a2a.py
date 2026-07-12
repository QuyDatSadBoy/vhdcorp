"""A2A (Agent-to-Agent) — §9.5.

- GET /.well-known/agent-card.json : Agent Card chuẩn A2A.
- POST /a2a : JSON-RPC 2.0, hỗ trợ method "message/send".
"""

import logging
import uuid

from fastapi import APIRouter, Request

from app.core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()


def _agent_card() -> dict:
    settings = get_settings()
    base = settings.public_base_url.rstrip("/")
    return {
        "protocolVersion": "0.2.5",
        "name": "VHD Corp Assistant",
        "description": (
            "Trợ lý AI của VHD Corp — tra cứu sản phẩm (nhựa PVC, cao su kỹ thuật, "
            "đặc sản làng nghề), báo giá và tạo yêu cầu liên hệ cho khách hàng."
        ),
        "url": f"{base}/a2a",
        "version": "1.0.0",
        "capabilities": {
            "streaming": False,
            "pushNotifications": False,
            "stateTransitionHistory": False,
        },
        "defaultInputModes": ["text"],
        "defaultOutputModes": ["text"],
        "skills": [
            {
                "id": "product-qa",
                "name": "Hỏi đáp sản phẩm",
                "description": "Tra cứu giá, tồn kho, thông tin sản phẩm trong catalog VHD Corp.",
                "tags": ["products", "pricing", "catalog"],
                "examples": [
                    "Ống nhựa PVC D21 giá bao nhiêu?",
                    "Bên bạn có bán cao su chống rung không?",
                ],
            },
            {
                "id": "create-contact",
                "name": "Tạo yêu cầu liên hệ",
                "description": "Gửi yêu cầu liên hệ/báo giá của khách tới đội ngũ VHD Corp.",
                "tags": ["contact", "lead", "quote"],
                "examples": [
                    "Mình muốn báo giá 100 ống nhựa, email nam@example.com",
                ],
            },
        ],
    }


@router.get("/.well-known/agent-card.json")
async def agent_card():
    return _agent_card()


def _jsonrpc_error(req_id, code: int, message: str) -> dict:
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}


@router.post("/a2a")
async def a2a(request: Request):
    try:
        body = await request.json()
    except Exception:  # noqa: BLE001
        return _jsonrpc_error(None, -32700, "Parse error")

    req_id = body.get("id")
    if body.get("jsonrpc") != "2.0":
        return _jsonrpc_error(req_id, -32600, "Invalid Request: yêu cầu jsonrpc 2.0")

    method = body.get("method")
    if method != "message/send":
        return _jsonrpc_error(req_id, -32601, f"Method '{method}' không được hỗ trợ")

    params = body.get("params") or {}
    message = params.get("message") or {}
    parts = message.get("parts") or []
    text = " ".join(
        p.get("text", "") for p in parts if isinstance(p, dict) and p.get("text")
    ).strip()
    if not text:
        return _jsonrpc_error(req_id, -32602, "Invalid params: thiếu message.parts[].text")

    chat_service = request.app.state.chat_service
    answer = await chat_service.run_once(text)

    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "result": {
            "role": "agent",
            "parts": [{"kind": "text", "text": answer}],
            "kind": "message",
            "messageId": str(uuid.uuid4()),
        },
    }
