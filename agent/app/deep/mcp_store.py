"""Kho MCP SERVER cho DeepAgents — admin cấu hình được từ trang /admin.

Admin khai báo các MCP server (HTTP streamable / SSE) → tool của chúng được nạp thêm
vào agent ở trang khách. Lưu ở data/mcp_servers.local.json (không vào git).

An toàn: CHỈ nhận transport HTTP(S) (không cho chạy lệnh stdio → không thể mượn admin
UI để chạy tiến trình trên máy chủ). Nạp tool là best-effort: 1 server chết thì bỏ qua
server đó, chat vẫn chạy bình thường.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_MAX_SERVERS = 20
_LOAD_TIMEOUT = 8.0  # giây — không để 1 server chậm làm treo cả agent


def _path() -> Path:
    return Path(get_settings().chat_db_path).with_name("mcp_servers.local.json")


def _load() -> list[dict[str, Any]]:
    p = _path()
    try:
        raw = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
    except Exception:
        raw = {}
    items = raw.get("servers") if isinstance(raw, dict) else None
    return [s for s in (items or []) if isinstance(s, dict)]


def _save(servers: list[dict[str, Any]]) -> None:
    p = _path()
    p.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(p.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump({"servers": servers}, f, ensure_ascii=False)
        os.replace(tmp, p)
    except Exception:
        if os.path.exists(tmp):
            os.unlink(tmp)


def list_servers() -> list[dict[str, Any]]:
    return _load()


def upsert_server(name: str, url: str, transport: str = "streamable_http", enabled: bool = True) -> dict:
    """Thêm/sửa 1 MCP server (khoá theo name). CHỈ cho http/https."""
    name = (name or "").strip()
    url = (url or "").strip()
    if not name:
        raise ValueError("Thiếu tên server")
    scheme = urlparse(url).scheme.lower()
    if scheme not in ("http", "https"):
        raise ValueError("URL phải là http(s) — không hỗ trợ transport stdio vì lý do bảo mật")
    if transport not in ("streamable_http", "sse"):
        raise ValueError("transport phải là streamable_http hoặc sse")
    item = {"name": name, "url": url, "transport": transport, "enabled": bool(enabled)}
    servers = _load()
    for i, s in enumerate(servers):
        if s.get("name") == name:
            servers[i] = item
            break
    else:
        if len(servers) >= _MAX_SERVERS:
            raise ValueError(f"Tối đa {_MAX_SERVERS} MCP server")
        servers.append(item)
    _save(servers)
    return item


def delete_server(name: str) -> bool:
    servers = _load()
    kept = [s for s in servers if s.get("name") != name]
    if len(kept) == len(servers):
        return False
    _save(kept)
    return True


async def load_tools() -> list:
    """Nạp tool từ mọi MCP server đang BẬT. Lỗi/thiếu thư viện → trả [] (chat vẫn chạy)."""
    enabled = [s for s in _load() if s.get("enabled", True) and s.get("url")]
    if not enabled:
        return []
    try:
        from langchain_mcp_adapters.client import MultiServerMCPClient
    except ImportError:
        logger.warning("Chưa cài langchain-mcp-adapters → bỏ qua %d MCP server", len(enabled))
        return []

    cfg = {s["name"]: {"url": s["url"], "transport": s.get("transport", "streamable_http")} for s in enabled}
    try:
        client = MultiServerMCPClient(cfg)
        return await asyncio.wait_for(client.get_tools(), timeout=_LOAD_TIMEOUT)
    except Exception:  # noqa: BLE001 — MCP lỗi không được làm chết agent
        logger.exception("Không nạp được tool MCP (%s)", ", ".join(cfg))
        return []
