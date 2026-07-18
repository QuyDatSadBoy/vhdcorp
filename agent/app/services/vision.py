"""Vision: dùng Gemini đa phương thức mô tả ảnh sản phẩm khách gửi (§9.4).

Trả về mô tả tiếng Việt ngắn (loại sản phẩm) để map sang catalog qua search_products.
"""

import logging

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage

logger = logging.getLogger(__name__)

_VISION_PROMPT = (
    "Bạn là trợ lý của VHD Corp — kho tổng vật tư ngành điện lạnh & cơ điện (M&E) và sản xuất "
    "khuôn mẫu, đúc nhựa. Nhìn ảnh và cho biết NGẮN GỌN đây có thể là sản phẩm gì (ví dụ: gas lạnh, "
    "ống đồng, gioăng cao su, đai treo, băng dính, dây điện, van, ốc vít...). "
    "Chỉ trả về 3-8 từ khóa tiếng Việt mô tả loại sản phẩm, không giải thích."
)


async def describe_image(llm: BaseChatModel, image_data_url: str) -> str:
    """Mô tả ảnh (data URL base64) → chuỗi từ khóa tiếng Việt. Lỗi → chuỗi rỗng."""
    if not image_data_url:
        return ""
    try:
        message = HumanMessage(
            content=[
                {"type": "text", "text": _VISION_PROMPT},
                {"type": "image_url", "image_url": {"url": image_data_url}},
            ]
        )
        response = await llm.ainvoke([message])
        text = getattr(response, "text", "")
        if not isinstance(text, str) and callable(text):
            text = text()
        return str(text or "").strip()
    except Exception:  # noqa: BLE001 — lỗi vision không được làm hỏng luồng chat
        logger.exception("describe_image lỗi")
        return ""
