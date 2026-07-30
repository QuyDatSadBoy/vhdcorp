"""Kiểm tra secret admin/resync cho endpoint nội bộ của agent.

- HẰNG THỜI GIAN (hmac.compare_digest) → chống dò secret qua timing.
- FAIL-CLOSED: secret CHƯA cấu hình (rỗng) hoặc client không gửi → LUÔN từ chối
  (không bao giờ để "rỗng khớp rỗng" mở toang API).
"""

from __future__ import annotations

import hmac

from fastapi import HTTPException

from app.core.config import get_settings


def _match(provided: str | None, expected: str) -> bool:
    if not expected or not provided:
        return False
    return hmac.compare_digest(provided, expected)


def require_admin(provided: str | None) -> None:
    if not _match(provided, get_settings().admin_secret):
        raise HTTPException(status_code=403, detail="Sai hoặc thiếu X-Admin-Secret.")


def require_resync(provided: str | None) -> None:
    if not _match(provided, get_settings().resync_secret):
        raise HTTPException(status_code=403, detail="Sai hoặc thiếu X-Resync-Secret.")
