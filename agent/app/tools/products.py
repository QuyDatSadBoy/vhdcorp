"""Tools tra cứu catalog sản phẩm — đọc TRỰC TIẾP PostgreSQL (fallback data/products.json).

Fuzzy tiếng Việt không dấu; load_catalog_live() cập nhật cache mỗi lượt tool chạy."""

import json
import unicodedata
from pathlib import Path

from langchain_core.tools import tool

from app.core.config import get_settings
from app.tools.base import catch_tool_errors

_catalog: list[dict] | None = None


def normalize_vi(text: str) -> str:
    """lowercase + đ→d + bỏ dấu tiếng Việt."""
    text = (text or "").lower().replace("đ", "d")
    text = unicodedata.normalize("NFD", text)
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


def load_catalog(force: bool = False) -> list[dict]:
    global _catalog
    if _catalog is not None and not force:
        return _catalog
    path = Path(get_settings().products_json_path)
    if not path.exists():
        _catalog = []
        return _catalog
    products = json.loads(path.read_text(encoding="utf-8"))
    for p in products:
        blob = " ".join(
            str(p.get(k) or "")
            for k in ("name", "slug", "description")
        ) + " " + str((p.get("category") or {}).get("name") or "")
        p["_search"] = normalize_vi(blob)
    _catalog = products
    return _catalog


async def load_catalog_live() -> list[dict]:
    """Đọc catalog TRỰC TIẾP từ PostgreSQL (real-time tuyệt đối); DB lỗi → products.json.
    Cập nhật cache module để các helper sync (find_products…) dùng ngay dữ liệu mới."""
    global _catalog
    from app.db.catalog import fetch_products  # import trễ tránh vòng lặp

    rows = await fetch_products()
    if rows:
        for p in rows:
            blob = " ".join(
                str(p.get(k) or "") for k in ("name", "slug", "description")
            ) + " " + str((p.get("category") or {}).get("name") or "")
            p["_search"] = normalize_vi(blob)
        _catalog = rows
        return rows
    return load_catalog()


def catalog_size() -> int:
    return len(load_catalog())


def format_price(price) -> str:
    try:
        return f"{int(float(price)):,}".replace(",", ".") + "đ"
    except (TypeError, ValueError):
        return str(price)


def _format_product(p: dict, detail: bool = False) -> str:
    category = (p.get("category") or {}).get("name") or "Khác"
    gia = f"Giá: {format_price(p.get('price'))}"
    if p.get("on_sale") and p.get("original_price"):
        gia = f"Giá KHUYẾN MÃI: {format_price(p.get('price'))} (giá gốc {format_price(p.get('original_price'))})"
    line = (
        f"- {p['name']} | {gia} | Tồn kho: {p.get('stock', 0)} "
        f"| Danh mục: {category} | Link: {p.get('url', '')}"
    )
    if detail and p.get("description"):
        line += f"\n  Mô tả: {p['description']}"
    return line


def find_products(query: str, limit: int = 5) -> list[dict]:
    """Tìm và xếp hạng sản phẩm khớp query → trả list dict (dùng cho tool + gen-UI)."""
    catalog = load_catalog()
    q = normalize_vi(query)
    tokens = [t for t in q.split() if t]
    if not catalog or not tokens:
        return []

    scored: list[tuple[float, dict]] = []
    for p in catalog:
        blob = p["_search"]
        matched = sum(1 for t in tokens if t in blob)
        if matched == 0:
            continue
        score = matched / len(tokens)
        if q in blob:
            score += 1.0  # khớp nguyên cụm
        scored.append((score, p))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [p for _, p in scored[:limit]]


def find_product_by_slug(slug_or_name: str) -> dict | None:
    """Tra 1 sản phẩm theo slug hoặc tên (dùng cho get_product_detail + gen-UI + MCP)."""
    catalog = load_catalog()
    key = normalize_vi(slug_or_name).replace("-", " ")
    for p in catalog:
        slug_norm = normalize_vi(p.get("slug", "")).replace("-", " ")
        name_norm = normalize_vi(p.get("name", ""))
        if key == slug_norm or key == name_norm or key in name_norm or key in slug_norm:
            return p
    return None


@tool
@catch_tool_errors
async def search_products(query: str) -> str:
    """Tìm sản phẩm trong catalog VHD Corp theo tên/mô tả/danh mục.
    Hỗ trợ tiếng Việt có dấu và không dấu (ví dụ: 'ống nhựa' hoặc 'ong nhua').
    Trả về danh sách sản phẩm khớp kèm giá, tồn kho và link (dữ liệu trực tiếp từ DB)."""
    catalog = await load_catalog_live()
    if not catalog:
        return "Catalog sản phẩm hiện chưa có dữ liệu."
    q = normalize_vi(query)
    tokens = [t for t in q.split() if t]
    if not tokens:
        return "Vui lòng nhập từ khóa tìm kiếm."

    top = find_products(query, limit=5)
    if not top:
        return f"Không tìm thấy sản phẩm nào khớp với '{query}' trong catalog."
    return "Các sản phẩm tìm thấy:\n" + "\n".join(_format_product(p) for p in top)


@tool
@catch_tool_errors
async def get_product_detail(slug_or_name: str) -> str:
    """Lấy thông tin chi tiết một sản phẩm theo slug hoặc tên
    (giá, tồn kho, mô tả, danh mục, link trang sản phẩm) — dữ liệu trực tiếp từ DB."""
    await load_catalog_live()
    p = find_product_by_slug(slug_or_name)
    if p is not None:
        return "Chi tiết sản phẩm:\n" + _format_product(p, detail=True)
    return f"Không tìm thấy sản phẩm '{slug_or_name}'. Hãy thử search_products với từ khóa khác."
