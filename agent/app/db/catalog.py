"""Đọc TRỰC TIẾP PostgreSQL của BE — nguồn dữ liệu real-time tuyệt đối cho agent.

Bao phủ đủ các module chính của web: sản phẩm, bài viết, danh mục, gợi ý
"khách xem X cũng xem Y" (co-view từ bảng view_events) và thông tin công ty
(site_configs). Mọi hàm đều read-only; DB lỗi/chưa cấu hình → trả [] hoặc None
để tool fallback (products.json với sản phẩm) thay vì vỡ hội thoại.
"""

import json
import logging
from datetime import datetime
from typing import Any

import asyncpg

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool | None:
    """Pool kết nối lười khởi tạo; không có CATALOG_DATABASE_URL → None."""
    global _pool
    if _pool is not None:
        return _pool
    dsn = get_settings().catalog_database_url
    if not dsn:
        return None
    try:
        _pool = await asyncpg.create_pool(dsn, min_size=1, max_size=4, command_timeout=10)
    except Exception as exc:  # noqa: BLE001 — DB down không được làm vỡ chat
        logger.warning("Không kết nối được catalog DB: %s", exc)
        return None
    return _pool


async def _fetch(query: str, *args: Any) -> list[asyncpg.Record]:
    pool = await get_pool()
    if pool is None:
        return []
    try:
        async with pool.acquire() as conn:
            return await conn.fetch(query, *args)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Query catalog DB lỗi: %s", exc)
        return []


def _product_row_to_dict(r: asyncpg.Record) -> dict:
    """Chuẩn hóa row products → dict cùng shape với data/products.json."""
    images = r.get("images") or []
    if isinstance(images, str):
        try:
            images = json.loads(images)
        except ValueError:
            images = []
    # Giá hiệu lực = salePrice khi còn hạn KM (đồng bộ 100% với web/giỏ hàng)
    base = float(r["price"]) if r["price"] is not None else None
    sale = float(r["salePrice"]) if r.get("salePrice") is not None else None
    ends = r.get("saleEndsAt")
    on_sale = bool(sale and sale > 0 and (ends is None or ends > datetime.now()))
    return {
        "id": r["id"],
        "slug": r["slug"],
        "name": r["name"],
        "description": r.get("description") or "",
        "price": sale if on_sale else base,
        "original_price": base if on_sale else None,
        "on_sale": on_sale,
        "stock": r["stock"],
        "image": images[0] if images else "",
        "category": {"name": r.get("category_name") or "Khác"},
        "url": f"/products/{r['slug']}",
    }


_PRODUCT_SELECT = """
SELECT p.id, p.slug, p.name, p.description, p.price, p."salePrice", p."saleEndsAt",
       p.stock, p.images, c.name AS category_name
FROM products p
LEFT JOIN categories c ON c.id = p."categoryId"
WHERE p.status = 'PUBLISHED' AND p."deletedAt" IS NULL
"""


async def fetch_products() -> list[dict]:
    """Toàn bộ sản phẩm đang bán — dùng cho search fuzzy phía tools."""
    rows = await _fetch(_PRODUCT_SELECT + ' ORDER BY p."createdAt" DESC')
    return [_product_row_to_dict(r) for r in rows]


async def fetch_recommendations(product_slug: str, limit: int = 4) -> list[dict]:
    """Gợi ý co-view: khách xem sản phẩm này còn xem gì (bảng view_events);
    thiếu dữ liệu → sản phẩm cùng danh mục."""
    rows = await _fetch(
        _PRODUCT_SELECT
        + """
        AND p.id IN (
            SELECT v2."productId"
            FROM view_events v1
            JOIN view_events v2
              ON v2."sessionId" = v1."sessionId" AND v2."productId" <> v1."productId"
            JOIN products src ON src.id = v1."productId"
            WHERE src.slug = $1
            GROUP BY v2."productId"
            ORDER BY count(*) DESC
            LIMIT $2
        )
        """,
        product_slug,
        limit,
    )
    if rows:
        return [_product_row_to_dict(r) for r in rows]
    rows = await _fetch(
        _PRODUCT_SELECT
        + """
        AND p."categoryId" = (SELECT "categoryId" FROM products WHERE slug = $1)
        AND p.slug <> $1
        LIMIT $2
        """,
        product_slug,
        limit,
    )
    return [_product_row_to_dict(r) for r in rows]


async def fetch_posts(limit: int = 20) -> list[dict]:
    """Bài viết đã đăng (mới nhất trước) — title/excerpt/tags/link."""
    rows = await _fetch(
        """
        SELECT slug, title, excerpt, tags, "publishedAt", "coverImage"
        FROM posts
        WHERE status = 'PUBLISHED' AND "deletedAt" IS NULL
        ORDER BY "publishedAt" DESC NULLS LAST
        LIMIT $1
        """,
        limit,
    )
    out = []
    for r in rows:
        tags = r.get("tags") or []
        if isinstance(tags, str):
            tags = [t for t in tags.split(",") if t]
        out.append(
            {
                "slug": r["slug"],
                "title": r["title"],
                "excerpt": r.get("excerpt") or "",
                "tags": list(tags),
                "published_at": str(r.get("publishedAt") or ""),
                "cover": r.get("coverImage") or "",
                "url": f"/posts/{r['slug']}",
            }
        )
    return out


async def fetch_categories() -> list[dict]:
    """Danh mục + số sản phẩm đang bán trong mỗi danh mục."""
    rows = await _fetch(
        """
        SELECT c.slug, c.name,
               count(p.id) FILTER (
                   WHERE p.status = 'PUBLISHED' AND p."deletedAt" IS NULL
               ) AS product_count
        FROM categories c
        LEFT JOIN products p ON p."categoryId" = c.id
        GROUP BY c.id
        ORDER BY c."order", c.name
        """
    )
    return [
        {
            "slug": r["slug"],
            "name": r["name"],
            "product_count": int(r["product_count"] or 0),
            "url": f"/products?category={r['slug']}",
        }
        for r in rows
    ]


async def fetch_company_info() -> dict | None:
    """Thông tin công ty từ site config PUBLISHED (brand + footer.contact + social)."""
    rows = await _fetch(
        """
        SELECT value FROM site_configs
        WHERE key = 'main' AND status = 'PUBLISHED'
        ORDER BY version DESC LIMIT 1
        """
    )
    if not rows:
        return None
    value = rows[0]["value"]
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except ValueError:
            return None
    brand = value.get("brand") or {}
    footer = value.get("footer") or {}
    contact = footer.get("contact") or {}
    return {
        "site_name": brand.get("siteName") or "VHD Corp",
        "tagline": brand.get("tagline") or "",
        "description": footer.get("description") or "",
        "email": contact.get("email") or "",
        "hotline": contact.get("hotline") or contact.get("phone") or "",
        "address": contact.get("address") or "",
        "zalo": contact.get("zaloUrl") or "",
        "messenger": contact.get("messengerUrl") or "",
        "social": [s for s in (footer.get("social") or []) if s.get("url")],
    }
