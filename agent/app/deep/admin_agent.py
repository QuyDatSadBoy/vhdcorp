"""Deep agent cho TRỢ LÝ ADMIN — cùng lõi DeepAgents như chat khách, khác bộ quyền.

Khác chat khách ở 3 điểm:
- Không có tool giao diện khách (carousel/form) — admin cần dữ liệu và bản nháp, không cần
  render card bán hàng.
- Có skill riêng về viết mô tả sản phẩm chuẩn SEO, soạn bài, rà soát nội dung.
- Nói thẳng số liệu kho (tồn, số lượng sản phẩm) vì người dùng là chủ website.

Vẫn giữ nguyên nguyên tắc KHÔNG BỊA: mọi số liệu phải tra bằng tool.
"""

from __future__ import annotations

import logging

from app.deep.builder import build_deep_agent

logger = logging.getLogger(__name__)

ADMIN_PERSONA = """Bạn là TRỢ LÝ ĐIỀU HÀNH của admin website VHD Corp — kho tổng vật tư điện lạnh, cơ điện (M&E) và nhà sản xuất khuôn mẫu, đúc nhựa.

Người bạn nói chuyện là CHỦ/QUẢN TRỊ website, không phải khách hàng. Vì vậy:
- Nói thẳng số liệu thật của kho (số sản phẩm, tồn, danh mục) — tra bằng tool rồi trả lời.
- Văn phong ngắn gọn, đi thẳng việc, tiếng Việt. Không chào hỏi dài dòng, không bán hàng.
- Khi được nhờ soạn nội dung: trả về bản NHÁP hoàn chỉnh để admin duyệt, không hỏi lại lắt nhắt.

Bạn làm được:
1. Soạn nháp sản phẩm mới (tên, mô tả chuẩn SEO, metaTitle/metaDescription, gợi ý danh mục).
2. Soạn nháp bài viết/tin tức (Markdown, chuẩn SEO).
3. Trả lời về kho thật: bao nhiêu sản phẩm, thuộc danh mục nào, tìm 1 sản phẩm cụ thể.
4. Tư vấn kinh doanh & SEO: từ khoá, ý tưởng bài theo mùa vụ, cải thiện mô tả hiện có.
5. Trả lời về chính sách/thông tin công ty (tra tài liệu nội bộ).

LUẬT TỐI THƯỢNG — KHÔNG BỊA: mọi con số, tên sản phẩm, chính sách phải đến từ tool
(search_products, get_product_detail, list_categories, search_knowledge, get_company_info)
hoặc từ web_search khi là kiến thức ngành. Không tra được thì nói thẳng "chưa có dữ liệu này".
Giá sản phẩm trên web mặc định là "Liên hệ báo giá" — đừng tự đặt giá.

Bạn KHÔNG tự ghi vào cơ sở dữ liệu. Bản nháp luôn để admin duyệt rồi tự tạo."""


def admin_skill_files() -> dict[str, dict[str, str]]:
    """SKILL riêng của trợ lý admin (đọc từ agent/skills-admin/*/SKILL.md)."""
    from app.deep import default_skills

    return default_skills.admin_to_files()


# Bộ tool của admin = tra cứu thuần. KHÔNG có tool giao diện khách
# (show_product_carousel / show_contact_form / show_quote_form / add_to_cart…):
# admin xem bảng dữ liệu và bản nháp, không render card bán hàng cho chính mình.
ADMIN_TOOL_NAMES = (
    "search_products",
    "get_product_detail",
    "list_categories",
    "search_knowledge",
    "get_company_info",
    "search_posts",
    "web_search",
    "web_fetch",
    "get_recommendations",
)


def admin_tools() -> list:
    """Đối tượng tool theo đúng ADMIN_TOOL_NAMES (giữ nguyên thứ tự)."""
    from app.tools.knowledge import search_knowledge
    from app.tools.products import get_product_detail, search_products
    from app.tools.site import (
        get_company_info,
        get_recommendations,
        list_categories,
        search_posts,
    )
    from app.tools.web_fetch import web_fetch
    from app.tools.web_search import web_search

    by_name = {
        t.name: t
        for t in (
            search_products,
            get_product_detail,
            list_categories,
            search_knowledge,
            get_company_info,
            search_posts,
            web_search,
            web_fetch,
            get_recommendations,
        )
    }
    return [by_name[n] for n in ADMIN_TOOL_NAMES]


def build_admin_agent(llms: list, tools: list, max_models: int = 4):
    """Deep agent cho admin: cùng lõi, khác persona + bộ tool."""
    return build_deep_agent(llms, tools, system_prompt=ADMIN_PERSONA, max_models=max_models)


_agent = None  # cache: mỗi lần dựng là 1 lần biên dịch graph → chỉ dựng 1 lần cho cả tiến trình


def get_admin_agent():
    """Deep agent admin dùng chung (lazy + cache). Model tái dùng chuỗi fallback của chat."""
    global _agent
    if _agent is None:
        from app.core.config import get_settings
        from app.graph.builder import ChatGraphBuilder

        settings = get_settings()
        _agent = build_admin_agent(
            ChatGraphBuilder(settings).model_chain,
            admin_tools(),
            max_models=settings.deep_agent_max_fallbacks,
        )
        logger.info("Đã dựng deep agent ADMIN (%d tool)", len(ADMIN_TOOL_NAMES))
    return _agent


def reset_admin_agent() -> None:
    """Xoá cache agent (dùng trong test / khi đổi cấu hình model)."""
    global _agent
    _agent = None
