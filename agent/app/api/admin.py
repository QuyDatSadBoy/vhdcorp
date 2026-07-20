"""Endpoint admin (bảo vệ bằng header bí mật) — KHÔNG expose cho chat công khai.

- POST /api/admin/resync-products : đồng bộ lại products.json từ BE + reload catalog in-memory.
- GET  /api/admin/emails          : đọc email gần nhất từ hộp thư Gmail (IMAP).
- GET/PUT /api/admin/knowledge    : đọc/ghi knowledge.md (admin sửa qua giao diện FE).
"""

import logging
from pathlib import Path

from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.services.gmail_reader import GmailReaderError, list_recent_emails
from app.core import rate_limit, usage
from app.services.knowledge import load_knowledge
from app.services.product_sync import sync_products
from app.tools.products import load_catalog

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin")


@router.post("/resync-products")
async def resync_products(x_resync_secret: str = Header(None, alias="X-Resync-Secret")):
    settings = get_settings()
    if x_resync_secret != settings.resync_secret:
        raise HTTPException(status_code=403, detail="Sai hoặc thiếu X-Resync-Secret.")

    try:
        count = await sync_products(settings.be_api_url, settings.products_json_path)
    except Exception as exc:  # noqa: BLE001 — báo lỗi rõ, không crash service
        logger.exception("Resync sản phẩm thất bại")
        raise HTTPException(status_code=502, detail=f"Không đồng bộ được từ BE: {exc}") from exc

    load_catalog(force=True)  # reload catalog in-memory
    load_knowledge(force=True)  # tiện thể nạp lại knowledge nếu khách vừa sửa
    return {"count": count}


class KnowledgePayload(BaseModel):
    content: str = Field(max_length=200_000)


@router.get("/knowledge")
async def get_knowledge(x_admin_secret: str = Header(None, alias="X-Admin-Secret")):
    settings = get_settings()
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Sai hoặc thiếu X-Admin-Secret.")
    return {"content": load_knowledge(force=True)}


@router.put("/knowledge")
async def put_knowledge(
    body: KnowledgePayload,
    x_admin_secret: str = Header(None, alias="X-Admin-Secret"),
):
    settings = get_settings()
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Sai hoặc thiếu X-Admin-Secret.")

    # Ghi vào bản .local (gitignore) — không làm bẩn cây git khi deploy
    path = Path(settings.knowledge_md_path).with_name("knowledge.local.md")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body.content, encoding="utf-8")
    load_knowledge(force=True)  # agent dùng nội dung mới ngay, không cần restart
    return {"ok": True, "chars": len(body.content)}


@router.get("/emails")
async def get_emails(
    x_admin_secret: str = Header(None, alias="X-Admin-Secret"),
    limit: int = Query(10, ge=1, le=50),
    unread_only: bool = Query(False),
):
    settings = get_settings()
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Sai hoặc thiếu X-Admin-Secret.")

    try:
        emails = await run_in_threadpool(
            list_recent_emails, limit=limit, unread_only=unread_only
        )
    except GmailReaderError as exc:
        # Báo rõ (vd chưa bật IMAP) để admin xử lý — không crash service.
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {"count": len(emails), "emails": emails}


class ChatLimitsPayload(BaseModel):
    enabled: bool | None = None
    per_ip_per_min: int | None = Field(default=None, ge=0, le=1000)
    per_ip_per_hour: int | None = Field(default=None, ge=0, le=10000)
    per_ip_per_day: int | None = Field(default=None, ge=0, le=100000)
    global_per_day: int | None = Field(default=None, ge=0, le=1000000)
    blocked_ips: list[str] | None = None
    price_per_1m_input_vnd: float | None = Field(default=None, ge=0)
    price_per_1m_output_vnd: float | None = Field(default=None, ge=0)


@router.get("/chat-limits")
async def get_chat_limits(x_admin_secret: str = Header(None, alias="X-Admin-Secret")):
    """Xem cấu hình chống spam chat (admin)."""
    if x_admin_secret != get_settings().admin_secret:
        raise HTTPException(status_code=403, detail="Sai hoặc thiếu X-Admin-Secret.")
    return rate_limit.load_limits()


@router.put("/chat-limits")
async def put_chat_limits(
    body: ChatLimitsPayload,
    x_admin_secret: str = Header(None, alias="X-Admin-Secret"),
):
    """Chỉnh cấu hình chống spam chat — hiệu lực NGAY, không cần deploy."""
    if x_admin_secret != get_settings().admin_secret:
        raise HTTPException(status_code=403, detail="Sai hoặc thiếu X-Admin-Secret.")
    return rate_limit.save_limits(body.model_dump(exclude_none=True))


@router.get("/usage")
async def get_usage(
    days: int = Query(30, ge=1, le=60),
    x_admin_secret: str = Header(None, alias="X-Admin-Secret"),
):
    """Thống kê sử dụng AI + ước tính chi phí (admin)."""
    if x_admin_secret != get_settings().admin_secret:
        raise HTTPException(status_code=403, detail="Sai hoặc thiếu X-Admin-Secret.")
    return usage.stats(days)
