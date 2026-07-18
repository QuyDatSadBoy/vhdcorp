"""AI trợ lý admin: đọc ảnh (Gemini Vision) + web search (Tavily) → viết mô tả
sản phẩm / dàn ý bài viết. Bảo vệ bằng header X-Admin-Secret (như các admin API khác)."""

import json
import logging
import re

from fastapi import APIRouter, Header, HTTPException
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel

from app.core.config import get_settings
from app.tools.web_search import _tavily_search

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/ai")

BRAND = (
    "VHD Corp là KHO TỔNG bán sỉ vật tư ngành ĐIỆN LẠNH & CƠ ĐIỆN (M&E) và là nhà sản xuất "
    "KHUÔN MẪU, ĐÚC NHỰA, phục vụ khách trong nước. Giá sản phẩm luôn là 'Liên hệ báo giá'. "
    "Văn phong tiếng Việt, chuẩn xác, súc tích, KHÔNG phóng đại/chém gió."
)


def _check(secret: str | None) -> None:
    if secret != get_settings().admin_secret:
        raise HTTPException(status_code=403, detail="Sai hoặc thiếu X-Admin-Secret.")


def _llm(temperature: float = 0.6) -> ChatGoogleGenerativeAI:
    s = get_settings()
    return ChatGoogleGenerativeAI(
        model=s.agent_model, google_api_key=s.google_api_key, temperature=temperature
    )


def _text(resp) -> str:
    c = getattr(resp, "content", "")
    if isinstance(c, list):
        return " ".join(
            (p.get("text", "") if isinstance(p, dict) else str(p)) for p in c
        )
    return str(c or "")


def _parse_json(text: str) -> dict:
    t = re.sub(r"```(?:json)?", "", text).strip().strip("`").strip()
    m = re.search(r"\{.*\}", t, re.S)
    try:
        return json.loads(m.group(0)) if m else {}
    except Exception:  # noqa: BLE001
        return {}


def _img_blocks(images: list[str], limit: int = 4) -> list[dict]:
    return [{"type": "image_url", "image_url": {"url": u}} for u in images[:limit] if u]


# ─────────────── Sản phẩm ───────────────
class ProductAIReq(BaseModel):
    images: list[str] = []  # data URL base64 hoặc http URL đã upload
    prompt: str | None = None  # yêu cầu tùy chỉnh của admin (sửa được)
    name: str | None = None  # tên gợi ý (nếu có)


@router.post("/product-description")
async def product_description(
    body: ProductAIReq,
    x_admin_secret: str = Header(None, alias="X-Admin-Secret"),
):
    _check(x_admin_secret)
    llm = _llm()
    keywords = (body.name or "").strip()

    # 1) Đọc ảnh → từ khóa loại sản phẩm (nếu chưa có tên rõ)
    if body.images and not keywords:
        try:
            r = await llm.ainvoke([
                HumanMessage(content=[
                    {"type": "text", "text": "Ảnh vật tư ngành điện lạnh/cơ điện. Đây là sản phẩm gì? Trả về 3-8 từ khóa tiếng Việt, không giải thích."},
                    *_img_blocks(body.images, 3),
                ])
            ])
            keywords = _text(r).strip() or keywords
        except Exception:  # noqa: BLE001
            logger.exception("vision(product) lỗi")

    # 2) Web search cho chính xác
    web = ""
    q = (body.name or keywords).strip()
    if q:
        try:
            web = await _tavily_search(f"{q} vật tư điện lạnh cơ điện công dụng thông số")
        except Exception:  # noqa: BLE001
            pass

    # 3) Sinh nội dung JSON (đa phương thức: kèm ảnh nếu có)
    instr = (
        f"{BRAND}\n\nViết nội dung SẢN PHẨM cho website.\n"
        f"Loại/tên (từ ảnh hoặc admin): {keywords or '(chưa rõ — suy từ ảnh)'}\n"
        f"Tham khảo web (có thể rỗng):\n{web[:1500]}\n\n"
        f"Yêu cầu thêm của admin: {body.prompt or 'viết chuẩn SEO, súc tích, đúng ngành'}\n\n"
        'Trả về DUY NHẤT một JSON tiếng Việt dạng: '
        '{"name":"...","description":"...","metaTitle":"...","metaDesc":"..."}. '
        "name: tên sản phẩm ngắn gọn. description: 2-4 câu chính xác về công dụng/đặc điểm/quy cách, "
        "nhấn mạnh bán sỉ + 'liên hệ báo giá'. metaTitle < 60 ký tự. metaDesc < 160 ký tự."
    )
    try:
        r = await llm.ainvoke([HumanMessage(content=[{"type": "text", "text": instr}, *_img_blocks(body.images, 3)])])
        data = _parse_json(_text(r))
    except Exception:  # noqa: BLE001
        logger.exception("gen(product) lỗi")
        raise HTTPException(status_code=502, detail="AI tạo mô tả lỗi, thử lại.")
    if not data.get("description"):
        raise HTTPException(status_code=502, detail="AI không tạo được nội dung, thử lại.")
    return {"ok": True, **{k: str(data.get(k, "")) for k in ("name", "description", "metaTitle", "metaDesc")}}


# ─────────────── Bài viết ───────────────
class PostAIReq(BaseModel):
    idea: str | None = None
    images: list[str] = []


@router.post("/post-draft")
async def post_draft(
    body: PostAIReq,
    x_admin_secret: str = Header(None, alias="X-Admin-Secret"),
):
    _check(x_admin_secret)
    llm = _llm(0.7)
    hints = (body.idea or "").strip()

    if body.images:
        try:
            r = await llm.ainvoke([
                HumanMessage(content=[
                    {"type": "text", "text": "Ảnh này liên quan chủ đề gì trong ngành điện lạnh/cơ điện? 5-10 từ khóa tiếng Việt."},
                    *_img_blocks(body.images, 3),
                ])
            ])
            hints = (hints + " " + _text(r)).strip()
        except Exception:  # noqa: BLE001
            logger.exception("vision(post) lỗi")

    web = ""
    if hints:
        try:
            web = await _tavily_search(f"{hints} kiến thức ngành điện lạnh cơ điện")
        except Exception:  # noqa: BLE001
            pass

    instr = (
        f"{BRAND}\n\nViết BÀI BLOG hữu ích, chuẩn SEO cho website VHD Corp.\n"
        f"Ý tưởng/chủ đề: {hints or '(tự chọn 1 chủ đề hữu ích trong ngành)'}\n"
        f"Tham khảo web:\n{web[:1500]}\n\n"
        'Trả về DUY NHẤT một JSON tiếng Việt dạng: '
        '{"title":"...","excerpt":"...","content":"...","metaTitle":"...","metaDesc":"..."}. '
        "content là Markdown ~400-600 từ (có tiêu đề ## rõ ràng), chính xác, hữu ích, "
        "kết bằng gợi ý liên hệ VHD Corp. excerpt 1-2 câu. metaTitle < 60. metaDesc < 160."
    )
    try:
        r = await llm.ainvoke([HumanMessage(content=[{"type": "text", "text": instr}])])
        data = _parse_json(_text(r))
    except Exception:  # noqa: BLE001
        logger.exception("gen(post) lỗi")
        raise HTTPException(status_code=502, detail="AI tạo bài lỗi, thử lại.")
    if not data.get("content"):
        raise HTTPException(status_code=502, detail="AI không tạo được nội dung, thử lại.")
    return {"ok": True, **{k: str(data.get(k, "")) for k in ("title", "excerpt", "content", "metaTitle", "metaDesc")}}
