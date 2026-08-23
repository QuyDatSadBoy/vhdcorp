"""Tool web_fetch: đọc nội dung MỘT trang web cụ thể mà khách/admin đưa link.

Khác web_search (Tavily tìm theo từ khoá): ở đây đã biết chính xác địa chỉ cần đọc —
khách dán link bài viết, trang hàng của đối thủ, tài liệu kỹ thuật.

An toàn là phần chính của tool này. Một tool "tải URL bất kỳ" chạy trong mạng nội bộ
là đường để người ngoài đọc trộm dịch vụ nội bộ (metadata máy chủ, database, trang
quản trị) chỉ bằng cách dán link vào khung chat. Vì vậy:
- chỉ http/https,
- phân giải tên miền rồi CHẶN mọi địa chỉ nội bộ/riêng tư/loopback,
- kiểm lại sau MỖI lần chuyển hướng (chuyển hướng là cách phổ biến để lách),
- giới hạn dung lượng và thời gian, chỉ nhận nội dung dạng văn bản.
"""

from __future__ import annotations

import ipaddress
import logging
import re
import socket
from urllib.parse import urlparse

import httpx
from langchain_core.tools import tool

from app.tools.base import catch_tool_errors

logger = logging.getLogger(__name__)

_MAX_BYTES = 400_000        # đủ cho một trang bài viết, không để tải cả file lớn
_MAX_CHARS = 6_000          # phần trả cho model — dài hơn chỉ tốn token
_TIMEOUT = 15
_MAX_REDIRECTS = 3
_TEXT_TYPES = ("text/html", "text/plain", "application/json", "application/xhtml+xml")


def _is_public_address(host: str) -> tuple[bool, str]:
    """Tên miền có trỏ ra Internet công cộng không (chặn nội bộ/riêng tư/loopback)."""
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        return False, f"không phân giải được tên miền '{host}'"
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False, "địa chỉ nằm trong mạng nội bộ — không đọc"
    return True, ""


def _check_url(url: str) -> tuple[bool, str]:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False, "chỉ đọc được link http/https"
    if not parsed.hostname:
        return False, "link không có tên miền"
    return _is_public_address(parsed.hostname)


def _to_text(html: str) -> str:
    """Bóc chữ từ HTML: bỏ script/style, gộp khoảng trắng. Đủ dùng để model đọc hiểu."""
    html = re.sub(r"(?is)<(script|style|noscript)\b.*?</\1>", " ", html)
    html = re.sub(r"(?is)<br\s*/?>|</p>|</div>|</li>|</h[1-6]>", "\n", html)
    text = re.sub(r"(?s)<[^>]+>", " ", html)
    text = (
        text.replace("&nbsp;", " ").replace("&amp;", "&")
        .replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"')
    )
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\n\s*\n\s*\n+", "\n\n", text).strip()


@tool
@catch_tool_errors
async def web_fetch(url: str) -> str:
    """Đọc nội dung một trang web theo ĐÚNG ĐỊA CHỈ được đưa.

    Dùng khi khách hoặc admin dán một link cụ thể và muốn biết trong đó viết gì
    (bài viết, trang sản phẩm, tài liệu kỹ thuật). Nếu chỉ có từ khoá chứ chưa có
    link thì dùng web_search.
    """
    url = (url or "").strip()
    if not url:
        return "Chưa có địa chỉ trang cần đọc."
    ok, reason = _check_url(url)
    if not ok:
        return f"Không đọc được trang này: {reason}."

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=False) as client:
            current = url
            for _ in range(_MAX_REDIRECTS + 1):
                resp = await client.get(current, headers={"User-Agent": "VHDCorpBot/1.0"})
                if resp.status_code in (301, 302, 303, 307, 308):
                    nxt = resp.headers.get("location")
                    if not nxt:
                        return "Trang chuyển hướng nhưng không cho biết đi đâu."
                    current = str(httpx.URL(current).join(nxt))
                    # Kiểm lại sau MỖI lần chuyển hướng: đây là lối lách phổ biến
                    # (link công khai chuyển hướng về địa chỉ nội bộ).
                    ok, reason = _check_url(current)
                    if not ok:
                        return f"Trang chuyển hướng tới nơi không đọc được: {reason}."
                    continue
                break
            else:
                return "Trang chuyển hướng quá nhiều lần."

            if resp.status_code >= 400:
                return f"Trang trả về lỗi {resp.status_code}."
            ctype = resp.headers.get("content-type", "").split(";")[0].strip().lower()
            if ctype and not any(ctype.startswith(t) for t in _TEXT_TYPES):
                return f"Nội dung dạng {ctype} — tool này chỉ đọc được trang chữ."
            raw = resp.content[:_MAX_BYTES]
    except httpx.HTTPError as exc:
        return f"Không tải được trang: {exc}"

    body = raw.decode(resp.encoding or "utf-8", errors="replace")
    text = _to_text(body) if "html" in (ctype or "") else body.strip()
    if not text:
        return "Trang không có nội dung chữ nào đọc được."
    if len(text) > _MAX_CHARS:
        text = text[:_MAX_CHARS] + "\n…(đã cắt bớt)"
    return f"Nội dung trang {current}:\n\n{text}"
