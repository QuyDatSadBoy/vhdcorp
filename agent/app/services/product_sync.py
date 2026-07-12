"""Đồng bộ catalog sản phẩm từ BE NestJS → data/products.json.

Dùng ở 3 nơi:
- lifespan startup (app/main.py): tự đồng bộ trước khi nạp catalog.
- endpoint POST /api/admin/resync-products: đồng bộ theo yêu cầu (không cần restart).
- scripts/sync_products.py: chạy tay bằng CLI.

Nguồn dữ liệu: GET {BE_API_URL}/products?pageSize=100
→ {statusCode, success, data:{records:[...]}}. Chỉ lấy sản phẩm status == PUBLISHED.
"""

import json
import logging
import re
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def strip_html(raw: str) -> str:
    """Bỏ thẻ HTML + giải mã entity + gom khoảng trắng → mô tả gọn cho model đọc."""
    import html

    text = _TAG_RE.sub(" ", raw or "")
    text = html.unescape(text)
    return _WS_RE.sub(" ", text).strip()


def map_product(record: dict) -> dict:
    """Map 1 record từ BE → schema catalog nội bộ (đầy đủ field yêu cầu)."""
    category = record.get("category") or {}
    images = record.get("images") or []
    if not isinstance(images, list):
        images = []
    price = record.get("price")
    return {
        "id": record["id"],
        "slug": record["slug"],
        "name": record["name"],
        "price": int(float(price)) if price is not None else None,  # số VND
        "stock": record.get("stock", 0),
        "description": strip_html(record.get("description") or ""),
        "category": {"name": category.get("name"), "slug": category.get("slug")},
        "images": images,
        "image": images[0] if images else "",  # ảnh đại diện = ảnh đầu
        "status": record.get("status"),
        "url": f"/products/{record['slug']}",
    }


def map_published(records: list[dict]) -> list[dict]:
    """Lọc CHỈ sản phẩm PUBLISHED rồi map sang schema nội bộ."""
    return [map_product(r) for r in records if r.get("status") == "PUBLISHED"]


async def fetch_products(be_api_url: str, timeout: float = 30) -> list[dict]:
    """Gọi BE lấy sản phẩm PUBLISHED (raise nếu BE lỗi/không chạy)."""
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.get(f"{be_api_url}/products", params={"pageSize": 100})
    resp.raise_for_status()
    envelope = resp.json()
    if not envelope.get("success"):
        raise RuntimeError(f"BE trả về lỗi: {envelope}")
    records = envelope.get("data", {}).get("records", [])
    return map_published(records)


def write_catalog(products: list[dict], output_path: str) -> None:
    """Ghi đè file products.json (tạo thư mục nếu cần)."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(products, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


async def sync_products(be_api_url: str, output_path: str) -> int:
    """Fetch từ BE → ghi đè products.json. Trả về số sản phẩm đã ghi. Raise nếu BE lỗi."""
    products = await fetch_products(be_api_url)
    write_catalog(products, output_path)
    logger.info("Đồng bộ %d sản phẩm PUBLISHED từ BE vào %s", len(products), output_path)
    return len(products)
