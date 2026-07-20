"""Tools phủ các module còn lại của web: bài viết, danh mục, gợi ý co-view,
thông tin công ty — tất cả đọc TRỰC TIẾP PostgreSQL (app.db.catalog).

Các tool duyệt/xem đều push gen-UI để khách bấm được (post-list, category-list,
product-carousel) rồi trả note ngắn cho model viết lời dẫn — cùng cơ chế ui.py.
"""

import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from langchain_core.tools import tool

from app.db.catalog import (
    fetch_categories,
    fetch_company_info,
    fetch_posts,
    fetch_recommendations,
)
from app.tools.base import catch_tool_errors
from app.tools.products import find_product_by_slug, load_catalog_live, normalize_vi
from app.tools.ui import product_to_props, push_ui


@tool
@catch_tool_errors
async def search_posts(query: str = "") -> str:
    """Tìm/duyệt TIN TỨC & BÀI VIẾT trên website (dữ liệu trực tiếp từ DB).
    Dùng khi khách hỏi tin tức, bài viết, câu chuyện, kiến thức ngành, làng nghề…
    query để trống → các bài mới nhất. Hiển thị thẻ bài viết bấm được cho khách."""
    posts = await fetch_posts(limit=20)
    q = normalize_vi(query)
    if q:
        posts = [
            p
            for p in posts
            if q in normalize_vi(f"{p['title']} {p['excerpt']} {' '.join(p['tags'])}")
        ]
    posts = posts[:6]
    push_ui("post-list", {"posts": posts})
    if not posts:
        return f"Không có bài viết nào khớp '{query}'. Gợi ý khách xem trang /posts."
    titles = "; ".join(p["title"] for p in posts)
    return (
        f"Đã hiển thị {len(posts)} bài viết cho khách ({titles}). "
        "Viết 1-2 câu lời dẫn mời khách đọc, KHÔNG liệt kê lại."
    )


@tool
@catch_tool_errors
async def list_categories() -> str:
    """Liệt kê DANH MỤC sản phẩm của VHD Corp kèm số sản phẩm mỗi danh mục
    (dữ liệu trực tiếp từ DB). Dùng khi khách hỏi 'bán những nhóm hàng gì',
    'có danh mục nào'. Hiển thị chip danh mục bấm được cho khách."""
    cats = await fetch_categories()
    push_ui("category-list", {"categories": cats})
    if not cats:
        return "Chưa có danh mục nào trong hệ thống."
    lines = "; ".join(f"{c['name']} ({c['product_count']} SP)" for c in cats)
    return f"Đã hiển thị {len(cats)} danh mục cho khách: {lines}. Viết lời dẫn ngắn."


@tool
@catch_tool_errors
async def get_recommendations(product_name: str) -> str:
    """Gợi ý sản phẩm LIÊN QUAN theo hành vi thật của khách trên web
    ('khách xem sản phẩm này cũng xem…', dữ liệu tracking trực tiếp từ DB).
    Dùng khi khách đã quan tâm 1 sản phẩm và muốn xem thêm lựa chọn tương tự."""
    await load_catalog_live()
    p = find_product_by_slug(product_name)
    if p is None:
        return f"Không tìm thấy sản phẩm '{product_name}' để gợi ý. Thử search_products trước."
    recs = await fetch_recommendations(p["slug"], limit=4)
    push_ui("product-carousel", {"products": [product_to_props(r) for r in recs]})
    if not recs:
        return f"Chưa có gợi ý cho '{p['name']}' (dữ liệu xem còn ít)."
    names = ", ".join(r["name"] for r in recs)
    return (
        f"Đã hiển thị {len(recs)} sản phẩm khách hay xem cùng '{p['name']}' ({names}). "
        "Viết lời dẫn ngắn gọn."
    )


@tool
@catch_tool_errors
async def get_company_info() -> str:
    """Thông tin liên hệ CHÍNH THỨC của VHD Corp: email, hotline, địa chỉ, Zalo,
    mạng xã hội (đọc trực tiếp từ cấu hình site đang publish — luôn mới nhất).
    Dùng khi khách hỏi địa chỉ, số điện thoại, cách liên hệ, fanpage."""
    info = await fetch_company_info()
    if info is None:
        return "Chưa đọc được cấu hình site. Hướng dẫn khách vào trang /contact."
    lines = [f"{info['site_name']} — {info['tagline']}"]
    if info["description"]:
        lines.append(info["description"])
    if info["email"]:
        lines.append(f"Email: {info['email']}")
    if info["hotline"]:
        lines.append(f"Hotline: {info['hotline']}")
    if info["address"]:
        lines.append(f"Địa chỉ: {info['address']}")
    if info["zalo"]:
        lines.append(f"Zalo: {info['zalo']}")
    if info["messenger"]:
        lines.append(f"Messenger: {info['messenger']}")
    for s in info["social"]:
        lines.append(f"{(s.get('platform') or 'social').capitalize()}: {s.get('url')}")
    lines.append("Trang liên hệ: /contact")
    return "Thông tin công ty (trả lời khách dựa đúng theo đây):\n" + "\n".join(lines)


@tool
@catch_tool_errors
async def add_to_cart(product_name: str, qty: int = 1) -> str:
    """THÊM SẢN PHẨM VÀO GIỎ HÀNG hộ khách (giỏ hàng thật trên web, không cần đăng nhập).
    Dùng khi khách nói "thêm vào giỏ", "mua", "đặt X cái…". qty = số lượng (mặc định 1).
    Sau khi thêm hãy nhắc khách mở giỏ hàng để đặt đơn (không cần thanh toán online)."""
    await load_catalog_live()
    p = find_product_by_slug(product_name)
    if p is None:
        return f"Không tìm thấy sản phẩm '{product_name}'. Dùng search_products để hỏi lại khách."
    if (p.get("stock") or 0) <= 0:
        return f"'{p['name']}' đang tạm hết hàng — gợi ý khách để lại liên hệ."
    qty = max(1, min(int(qty or 1), 99))
    push_ui(
        "add-to-cart",
        {"product": product_to_props(p), "qty": qty, "action_id": str(uuid.uuid4())},
    )
    return (
        f"Đã thêm {qty} x '{p['name']}' vào giỏ hàng của khách (thẻ xác nhận đã hiển thị). "
        "Viết 1 câu xác nhận + mời khách bấm 'Xem giỏ hàng' để đặt đơn."
    )


_VN_WEEKDAYS = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật"]


@tool
@catch_tool_errors
async def get_current_time() -> str:
    """Lấy NGÀY GIỜ THẬT hiện tại theo giờ Việt Nam. BẮT BUỘC dùng khi khách hỏi
    mấy giờ / hôm nay thứ mấy, ngày mấy / còn mở cửa không — tuyệt đối không tự đoán."""
    now = datetime.now(ZoneInfo("Asia/Ho_Chi_Minh"))
    wd = _VN_WEEKDAYS[now.weekday()]
    return (
        f"Bây giờ là {now.strftime('%H:%M')}, {wd} ngày {now.strftime('%d/%m/%Y')} (giờ Việt Nam). "
        "Đối chiếu với mục 'Giờ mở cửa' trong THÔNG TIN CÔNG TY để trả lời còn mở cửa hay không."
    )
