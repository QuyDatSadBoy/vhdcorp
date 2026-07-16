"""Generative UI: tool "render" cho model + channel truyền lệnh render sang ChatService.

Cơ chế (theo AGENT_PLAN §9.2):
- ChatService tạo 1 list rỗng, gắn vào ContextVar `_ui_queue` trước khi chạy graph.
- Các tool show_* dưới đây append "lệnh render" {component, props} vào channel này,
  đồng thời trả về cho model 1 note ngắn để model viết lời dẫn.
- Sau mỗi tool.end, ChatService rút hàng đợi và emit SSE event `ui` TRƯỚC message.delta.
"""

import contextvars

from langchain_core.tools import tool

from app.tools.base import catch_tool_errors
from app.tools.products import find_product_by_slug, find_products, format_price, load_catalog_live

# Channel truyền lệnh render (mỗi lượt chat 1 list riêng để tránh rò rỉ giữa request).
_ui_queue: contextvars.ContextVar[list[dict] | None] = contextvars.ContextVar(
    "vhd_ui_queue", default=None
)


def set_ui_queue(queue: list[dict]):
    """ChatService gọi trước khi chạy graph; giữ token để reset sau."""
    return _ui_queue.set(queue)


def reset_ui_queue(token) -> None:
    _ui_queue.reset(token)


def push_ui(component: str, props: dict) -> None:
    """Tool ghi 1 lệnh render vào channel hiện tại (nếu có)."""
    queue = _ui_queue.get()
    if queue is not None:
        queue.append({"component": component, "props": props})


def product_to_props(p: dict) -> dict:
    """Chuẩn hóa 1 sản phẩm catalog → props FE (price là số VND, slug để build link)."""
    return {
        "id": p.get("id"),
        "name": p.get("name", ""),
        "price": p.get("price"),  # số nguyên VND (đã là giá KM nếu đang giảm)
        "originalPrice": p.get("original_price"),  # giá gốc khi đang KM — FE hiện gạch ngang
        "image": p.get("image") or p.get("image_url") or "",  # catalog hiện chưa có ảnh
        "slug": p.get("slug", ""),
        "stock": p.get("stock", 0),
        "category": (p.get("category") or {}).get("name") or "Khác",
    }


# ── FAQ tĩnh về nhựa / cao su / đặc sản làng nghề / giao hàng / thanh toán B2B ──
_FAQ_ITEMS = [
    {
        "question": "VHD Corp cung cấp những nhóm sản phẩm nào?",
        "answer": "Nhựa PVC (ống, phụ kiện), cao su kỹ thuật (tấm cao su non chống rung...) "
        "và đặc sản làng nghề Việt Nam (nón lá, tranh Đông Hồ, chè, nước mắm...).",
    },
    {
        "question": "Ống nhựa PVC và cao su non có bán số lượng lớn không?",
        "answer": "Có. Mình hỗ trợ báo giá theo số lượng cho khách B2B — bạn để lại nhu cầu "
        "và số lượng, đội ngũ VHD Corp sẽ gửi báo giá tốt nhất.",
    },
    {
        "question": "Đặc sản làng nghề (chè, nước mắm, miến...) có đảm bảo chất lượng không?",
        "answer": "Sản phẩm được tuyển chọn từ làng nghề truyền thống, cam kết nguồn gốc rõ ràng "
        "và chất lượng đồng đều cho từng lô hàng.",
    },
    {
        "question": "Chính sách giao hàng thế nào?",
        "answer": "Giao toàn quốc. Đơn số lượng lớn hoặc hàng cồng kềnh (ống nhựa, tấm cao su) "
        "sẽ được báo phí và thời gian vận chuyển cụ thể khi chốt đơn.",
    },
    {
        "question": "Khách doanh nghiệp (B2B) thanh toán bằng hình thức nào?",
        "answer": "Hỗ trợ chuyển khoản, xuất hóa đơn VAT và công nợ theo thỏa thuận hợp đồng "
        "với khách hàng doanh nghiệp.",
    },
    {
        "question": "Làm sao để nhận tư vấn/báo giá nhanh?",
        "answer": "Bạn để lại tên, email (và SĐT nếu có) cùng nhu cầu — mình gửi ngay cho đội ngũ "
        "VHD Corp để liên hệ lại sớm nhất.",
    },
]


@tool
@catch_tool_errors
async def show_product_carousel(query: str) -> str:
    """Hiển thị CAROUSEL sản phẩm trực quan cho khách (thẻ có ảnh, giá, link).
    Dùng khi khách muốn XEM/DUYỆT sản phẩm hoặc hỏi 'có những sản phẩm gì'.
    query là từ khóa danh mục/tên (vd: 'cao su', 'ống nhựa', 'đặc sản', 'nón lá')."""
    await load_catalog_live()
    products = find_products(query, limit=8)
    push_ui("product-carousel", {"products": [product_to_props(p) for p in products]})
    if not products:
        return f"Không tìm thấy sản phẩm nào khớp '{query}' để hiển thị carousel."
    names = ", ".join(p.get("name", "") for p in products)
    return (
        f"Đã hiển thị carousel {len(products)} sản phẩm cho khách ({names}). "
        "Hãy viết lời dẫn ngắn gọn mời khách xem, KHÔNG liệt kê lại giá dài dòng."
    )


@tool
@catch_tool_errors
async def show_contact_form(reason: str = "") -> str:
    """Hiển thị FORM ĐỂ LẠI LIÊN HỆ cho khách điền (tên, email, SĐT, nội dung).
    Dùng khi khách muốn được tư vấn/liên hệ nhưng chưa cung cấp đủ thông tin.
    reason (tùy chọn): lý do/nội dung gợi ý điền sẵn."""
    prefill = {"message": reason.strip()} if reason and reason.strip() else {}
    push_ui("contact-form", {"prefill": prefill})
    return (
        "Đã hiển thị form liên hệ cho khách. Hãy mời khách điền tên, email và nội dung "
        "để đội ngũ VHD Corp phản hồi."
    )


@tool
@catch_tool_errors
async def show_quote_form(product_name: str = "") -> str:
    """Hiển thị FORM YÊU CẦU BÁO GIÁ (sản phẩm, số lượng, tên, email, SĐT).
    Dùng khi khách cần báo giá theo SỐ LƯỢNG hoặc đặt hàng số lượng lớn.
    product_name (tùy chọn): tên sản phẩm khách quan tâm để điền sẵn."""
    products: list[dict] = []
    product = None
    if product_name and product_name.strip():
        p = find_product_by_slug(product_name) or (find_products(product_name, limit=1) or [None])[0]
        if p:
            product = p.get("name")
            products = [product_to_props(p)]
    push_ui("quote-request", {"product": product, "products": products})
    return (
        "Đã hiển thị form yêu cầu báo giá cho khách. Hãy mời khách nhập số lượng và "
        "thông tin liên hệ để nhận báo giá."
    )


@tool
@catch_tool_errors
async def show_comparison(product_names: list[str]) -> str:
    """Hiển thị BẢNG SO SÁNH nhiều sản phẩm (giá, tồn kho, danh mục).
    Dùng khi khách muốn so sánh 2+ sản phẩm. product_names là list tên/slug sản phẩm."""
    await load_catalog_live()
    found: list[dict] = []
    for name in product_names or []:
        p = find_product_by_slug(name) or (find_products(name, limit=1) or [None])[0]
        if p and p not in found:
            found.append(p)
    if len(found) < 2:
        push_ui("comparison-table", {"headers": [], "rows": []})
        return "Cần ít nhất 2 sản phẩm hợp lệ để so sánh. Hãy hỏi lại khách tên sản phẩm."

    headers = ["Tiêu chí", *[p.get("name", "") for p in found]]
    rows = [
        {
            "label": "Giá",
            "values": [format_price(p.get("price")) for p in found],
            "highlight": True,
        },
        {"label": "Tồn kho", "values": [str(p.get("stock", 0)) for p in found]},
        {
            "label": "Danh mục",
            "values": [(p.get("category") or {}).get("name") or "Khác" for p in found],
        },
    ]
    push_ui("comparison-table", {"headers": headers, "rows": rows})
    names = ", ".join(p.get("name", "") for p in found)
    return f"Đã hiển thị bảng so sánh cho: {names}. Hãy tóm tắt nhanh khác biệt chính giúp khách."


@tool
@catch_tool_errors
async def show_faq() -> str:
    """Hiển thị danh sách CÂU HỎI THƯỜNG GẶP (nhựa, cao su, đặc sản, giao hàng, thanh toán B2B).
    Dùng khi khách hỏi chung chung 'tư vấn giúp', 'có gì', hoặc cần thông tin tổng quan."""
    push_ui("faq", {"items": _FAQ_ITEMS})
    return "Đã hiển thị FAQ cho khách. Hãy mời khách bấm vào câu hỏi quan tâm hoặc hỏi trực tiếp."
