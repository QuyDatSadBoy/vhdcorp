"""Tool search_knowledge: tra cứu thông tin công ty (ngoài sản phẩm) từ knowledge.md."""

from langchain_core.tools import tool

from app.services.knowledge import search_knowledge_text
from app.tools.base import catch_tool_errors


@tool
@catch_tool_errors
def search_knowledge(query: str) -> str:
    """Tra cứu thông tin về VHD Corp NGOÀI sản phẩm: giờ mở cửa, địa chỉ/showroom,
    chính sách giao hàng, thanh toán (B2B/B2C), đổi trả/bảo hành, lĩnh vực kinh doanh,
    cam kết chất lượng, câu hỏi thường gặp. Dùng khi khách hỏi về công ty/chính sách,
    KHÔNG dùng để tra giá/tồn kho sản phẩm."""
    result = search_knowledge_text(query)
    if not result:
        return "Chưa có thông tin phù hợp trong tài liệu công ty."
    return result
