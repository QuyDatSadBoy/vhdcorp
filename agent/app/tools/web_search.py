"""Tool web_search dùng Tavily REST API, xoay vòng key khi rate-limit/lỗi."""

import logging

import httpx
from langchain_core.tools import tool

from app.core.config import get_settings
from app.tools.base import catch_tool_errors

logger = logging.getLogger(__name__)

_TAVILY_URL = "https://api.tavily.com/search"
_key_index = 0  # giữ vị trí key giữa các lần gọi


async def _tavily_search(query: str) -> str:
    global _key_index
    keys = get_settings().tavily_keys
    if not keys:
        return "Chưa cấu hình TAVILY_API_KEYS — không thể tìm kiếm web."

    last_error = ""
    async with httpx.AsyncClient(timeout=20) as client:
        for attempt in range(len(keys)):
            key = keys[_key_index % len(keys)]
            try:
                resp = await client.post(
                    _TAVILY_URL,
                    json={
                        "api_key": key,
                        "query": query,
                        "max_results": 5,
                        "search_depth": "basic",
                    },
                )
            except httpx.HTTPError as exc:
                last_error = f"Lỗi mạng khi gọi Tavily: {exc}"
                _key_index += 1
                continue

            if resp.status_code == 200:
                results = resp.json().get("results", [])
                if not results:
                    return f"Không tìm thấy kết quả web nào cho '{query}'."
                lines = []
                for r in results:
                    lines.append(f"- {r.get('title', '')} ({r.get('url', '')})\n  {r.get('content', '')[:300]}")
                return "Kết quả tìm kiếm web:\n" + "\n".join(lines)

            # 429/432 = rate-limit/quota → xoay key; lỗi khác cũng thử key kế tiếp
            last_error = f"Tavily trả về HTTP {resp.status_code}"
            logger.warning("Tavily key #%d lỗi %s — xoay key", _key_index % len(keys), resp.status_code)
            _key_index += 1

    return f"Tìm kiếm web thất bại sau khi thử {len(keys)} key. Lỗi cuối: {last_error}"


@tool
@catch_tool_errors
async def web_search(query: str) -> str:
    """Tìm kiếm thông tin trên web (Tavily). Chỉ dùng khi câu hỏi nằm ngoài
    catalog sản phẩm và kiến thức về VHD Corp (ví dụ: giá thị trường, tin tức, tiêu chuẩn kỹ thuật)."""
    return await _tavily_search(query)
