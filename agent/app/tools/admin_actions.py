"""Công cụ ĐỀ XUẤT thay đổi dữ liệu cho trợ lý điều hành.

Trợ lý KHÔNG tự ghi vào cơ sở dữ liệu. Nó mô tả thay đổi muốn làm, giao diện quản trị
hiện ra để admin đọc rồi bấm duyệt, và chính admin (với phiên đăng nhập của mình) mới
là người thực hiện. Lý do: cấp quyền ghi cho một mô hình ngôn ngữ nghĩa là một câu
hiểu nhầm cũng đủ sửa sai giá hàng loạt — mà giá là thứ khách nhìn thấy ngay.

Cùng cơ chế "chờ duyệt" mà deepseek-harness dùng cho lệnh nguy hiểm.
"""

from __future__ import annotations

import contextvars

from langchain_core.tools import tool

from app.tools.base import catch_tool_errors
from app.tools.products import find_product_by_slug, find_products, format_price

# Hàng đợi đề xuất của LƯỢT hiện tại (mỗi request một list riêng, không rò rỉ lẫn nhau)
_proposals: contextvars.ContextVar[list[dict] | None] = contextvars.ContextVar(
    "vhd_admin_proposals", default=None
)

# Chỉ cho sửa những trường an toàn và có thể xem lại bằng mắt. Ảnh, danh mục, slug…
# đụng tới quan hệ dữ liệu nên để admin tự làm trong form.
EDITABLE_FIELDS = {
    "price": "Giá bán",
    "stock": "Tồn kho",
    "status": "Trạng thái",
    "description": "Mô tả",
    "metaTitle": "Tiêu đề SEO",
    "metaDesc": "Mô tả SEO",
}
_STATUSES = {"DRAFT", "PUBLISHED", "ARCHIVED"}


def set_proposal_queue(queue: list[dict]):
    return _proposals.set(queue)


def reset_proposal_queue(token) -> None:
    _proposals.reset(token)


def _push(proposal: dict) -> None:
    queue = _proposals.get()
    if queue is not None:
        queue.append(proposal)


@tool
@catch_tool_errors
async def propose_product_update(slug: str, changes: dict, reason: str = "") -> str:
    """ĐỀ XUẤT sửa một sản phẩm để admin duyệt (KHÔNG tự lưu).

    Dùng khi admin bảo "đổi giá X thành Y", "cho mặt hàng này về nháp", "viết lại mô
    tả SEO cho sản phẩm Z". Chỉ sửa được: price, stock, status, description,
    metaTitle, metaDesc.

    slug: mã sản phẩm (lấy từ kết quả tra cứu, KHÔNG tự bịa).
    changes: chỉ những trường thực sự đổi, ví dụ {"price": 250000}.
    reason: một câu vì sao nên đổi — admin đọc câu này để quyết định.
    """
    slug = (slug or "").strip()
    if not slug:
        return "Thiếu mã sản phẩm. Hãy tra cứu để lấy đúng mã trước khi đề xuất."

    product = find_product_by_slug(slug) or (find_products(slug, limit=1) or [None])[0]
    if not product:
        return f"Không tìm thấy sản phẩm '{slug}' trong kho. Hãy tra cứu lại, đừng đoán mã."

    if not isinstance(changes, dict) or not changes:
        return "Chưa nêu thay đổi nào. Ví dụ: {'price': 250000}."

    bad = [k for k in changes if k not in EDITABLE_FIELDS]
    if bad:
        return (
            f"Không sửa được qua trợ lý: {', '.join(bad)}. "
            f"Chỉ nhận: {', '.join(EDITABLE_FIELDS)}. Những thứ khác admin sửa trong form."
        )

    clean: dict = {}
    for field, value in changes.items():
        if field in ("price", "stock"):
            try:
                num = int(float(value))
            except (TypeError, ValueError):
                return f"{EDITABLE_FIELDS[field]} phải là số, nhận được: {value!r}."
            if num < 0:
                return f"{EDITABLE_FIELDS[field]} không thể âm."
            clean[field] = num
        elif field == "status":
            status = str(value).strip().upper()
            if status not in _STATUSES:
                return f"Trạng thái phải là một trong: {', '.join(sorted(_STATUSES))}."
            clean[field] = status
        else:
            text = str(value).strip()
            if not text:
                return f"{EDITABLE_FIELDS[field]} đang để trống."
            clean[field] = text[:5000]

    # Kèm giá trị HIỆN TẠI để admin so sánh trước/sau ngay trên màn hình
    before = {}
    for field in clean:
        current = product.get("price") if field == "price" else product.get(field)
        before[field] = format_price(current) if field == "price" else current

    _push({
        "kind": "product-update",
        "slug": product.get("slug", slug),
        "productId": product.get("id"),
        "productName": product.get("name", ""),
        "before": before,
        "changes": clean,
        "reason": (reason or "").strip(),
    })
    doi = ", ".join(f"{EDITABLE_FIELDS[k]} → {v}" for k, v in clean.items())
    return (
        f"Đã trình đề xuất cho admin duyệt: {product.get('name', slug)} ({doi}). "
        "Hãy nói ngắn gọn vì sao nên đổi, rồi DỪNG chờ admin bấm duyệt — bạn KHÔNG tự lưu được."
    )
