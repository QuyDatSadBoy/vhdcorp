"""MCP server (FastMCP) — §9.6.

Publish catalog VHD Corp qua Model Context Protocol để Claude Desktop / IDE / agent khác
dùng trực tiếp. Mount vào FastAPI qua streamable-http tại /mcp (xem app/main.py).

streamable_http_path="/" → khi mount tại "/mcp" trong FastAPI, endpoint là /mcp.

Dùng factory build_mcp() (không singleton) vì StreamableHTTPSessionManager.run() chỉ
được vào 1 lần/instance — test tạo app nhiều lần cần instance mới mỗi lần.

Chạy standalone (ví dụ khai báo cho Claude Desktop):
    uv run python -m app.mcp_server        # streamable-http tại /mcp
"""

import httpx
from mcp.server.fastmcp import FastMCP

from app.core.config import get_settings
from app.tools.products import (
    find_product_by_slug,
    find_products,
    format_price,
    load_catalog,
)


def _product_dict(p: dict) -> dict:
    return {
        "slug": p.get("slug", ""),
        "name": p.get("name", ""),
        "price": p.get("price"),
        "price_display": format_price(p.get("price")),
        "stock": p.get("stock", 0),
        "category": (p.get("category") or {}).get("name") or "Khác",
        "url": p.get("url", ""),
        "description": p.get("description", ""),
    }


def search_products(query: str) -> list[dict]:
    """Tìm sản phẩm trong catalog VHD Corp theo tên/mô tả/danh mục (hỗ trợ tiếng Việt có/không dấu)."""
    load_catalog()
    return [_product_dict(p) for p in find_products(query, limit=8)]


def get_product(slug: str) -> dict:
    """Lấy chi tiết một sản phẩm theo slug (hoặc tên). Trả về {} nếu không tìm thấy."""
    load_catalog()
    p = find_product_by_slug(slug)
    return _product_dict(p) if p else {}


async def create_contact(name: str, email: str, message: str) -> dict:
    """Tạo yêu cầu liên hệ của khách gửi tới đội ngũ VHD Corp (lưu DB + gửi email)."""
    settings = get_settings()
    payload = {"name": name.strip()[:100], "email": email.strip(), "message": message.strip()[:2000]}
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(f"{settings.be_api_url}/contact", json=payload)
    return {"ok": resp.status_code < 300, "status": resp.status_code}


def build_mcp() -> FastMCP:
    """Tạo 1 FastMCP mới publish 3 tool catalog (mount tại /mcp)."""
    mcp = FastMCP("VHD Corp Catalog", streamable_http_path="/")
    mcp.add_tool(search_products)
    mcp.add_tool(get_product)
    mcp.add_tool(create_contact)
    return mcp


# Instance mặc định cho chạy standalone (không dùng khi mount vào FastAPI).
mcp = build_mcp()


if __name__ == "__main__":
    mcp.run(transport="streamable-http")
