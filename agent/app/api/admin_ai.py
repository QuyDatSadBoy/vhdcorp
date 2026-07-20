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
from app.tools.products import load_catalog_live
from app.services.knowledge import get_context_text
from app.core import usage

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




def _record_usage(resp) -> None:
    """Ghi token thật (nếu có) từ 1 response admin-AI để tính chi phí tổng."""
    try:
        um = getattr(resp, "usage_metadata", None) or {}
        meta = getattr(resp, "response_metadata", None) or {}
        model = meta.get("model_name") or get_settings().agent_model
        usage.record_request(model, int(um.get("input_tokens", 0) or 0), int(um.get("output_tokens", 0) or 0))
    except Exception:  # noqa: BLE001
        pass


def _img_blocks(images: list[str], limit: int = 4) -> list[dict]:
    return [{"type": "image_url", "image_url": {"url": u}} for u in images[:limit] if u]




async def _business_context(categories: list[str]) -> str:
    """Ngữ cảnh KHO THẬT + kiến thức công ty để trợ lý admin trả lời chính xác (như client)."""
    parts: list[str] = []
    try:
        cat = await load_catalog_live()
        pub = [p for p in cat if str(p.get("status", "PUBLISHED")).upper() == "PUBLISHED"]
        by_cat: dict[str, int] = {}
        for p in pub:
            cn = (p.get("category") or {}).get("name") or "Khác"
            by_cat[cn] = by_cat.get(cn, 0) + 1
        top = sorted(by_cat.items(), key=lambda x: -x[1])[:12]
        parts.append(
            f"KHO HIỆN CÓ: {len(pub)} sản phẩm đang bán. Theo danh mục: "
            + ", ".join(f"{k} ({v})" for k, v in top) + "."
        )
        names = ", ".join(p.get("name", "") for p in pub[:40])
        if names:
            parts.append("Một số sản phẩm: " + names)
    except Exception:  # noqa: BLE001
        logger.exception("business_context: load catalog lỗi")
    kn = get_context_text()
    if kn:
        parts.append("THÔNG TIN CÔNG TY:\n" + kn[:2500])
    if categories:
        parts.append("Danh mục để gán sản phẩm: " + ", ".join(categories))
    return "\n\n".join(parts)


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
        _record_usage(r)
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
        _record_usage(r)
        data = _parse_json(_text(r))
    except Exception:  # noqa: BLE001
        logger.exception("gen(post) lỗi")
        raise HTTPException(status_code=502, detail="AI tạo bài lỗi, thử lại.")
    if not data.get("content"):
        raise HTTPException(status_code=502, detail="AI không tạo được nội dung, thử lại.")
    return {"ok": True, **{k: str(data.get(k, "")) for k in ("title", "excerpt", "content", "metaTitle", "metaDesc")}}


# ─────────────── Trợ lý tổng quát admin (chat → soạn nháp sản phẩm/bài viết) ───────────────
class Msg(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class AssistantReq(BaseModel):
    messages: list[Msg] = []
    categories: list[str] = []  # tên danh mục hiện có (để AI gợi ý đúng)


@router.post("/assistant")
async def assistant(
    body: AssistantReq,
    x_admin_secret: str = Header(None, alias="X-Admin-Secret"),
):
    """Trợ lý admin: chat để soạn NHÁP sản phẩm/bài viết. Trả JSON {reply, action?}.
    KHÔNG tự ghi DB — FE hiển thị nháp để admin DUYỆT rồi mới tạo (bằng quyền admin)."""
    _check(x_admin_secret)
    if not body.messages:
        raise HTTPException(status_code=400, detail="Thiếu nội dung chat.")
    llm = _llm(0.6)

    convo = "\n".join(f"{m.role}: {m.content}" for m in body.messages[-8:])
    last = body.messages[-1].content if body.messages else ""
    ctx = await _business_context(body.categories)
    web = ""
    if len(last) > 3:
        try:
            web = await _tavily_search(f"{last} vật tư điện lạnh cơ điện")
        except Exception:  # noqa: BLE001
            pass

    instr = (
        f"{BRAND}\n\nBạn là TRỢ LÝ ĐIỀU HÀNH cho ADMIN website VHD Corp — làm được ĐỦ VIỆC:\n"
        "1) Soạn NHÁP sản phẩm mới (name, description chuẩn SEO, metaTitle/metaDesc, gợi ý danh mục).\n"
        "2) Soạn NHÁP bài viết/tin tức (Markdown ~400-600 từ, chuẩn SEO).\n"
        "3) Trả lời về KHO THẬT: có bao nhiêu sản phẩm, thuộc danh mục nào, tìm 1 sản phẩm cụ thể.\n"
        "4) Tư vấn KINH DOANH & SEO: gợi ý từ khóa, ý tưởng bài theo mùa vụ, cải thiện mô tả, chiến lược nội dung.\n"
        "5) Trả lời về chính sách/thông tin công ty (dựa THÔNG TIN CÔNG TY bên dưới).\n\n"
        f"{ctx}\n\n"
        f"Hội thoại gần đây:\n{convo}\n\n"
        f"Tham khảo web (có thể rỗng):\n{web[:1200]}\n\n"
        "QUY TẮC: KHÔNG bịa số liệu/sản phẩm — chỉ dựa dữ liệu trên; thiếu thì nói thẳng chưa có. "
        "Nếu admin hỏi 'bạn làm được gì' → liệt kê 5 việc trên kèm ví dụ câu lệnh.\n\n"
        "Trả về DUY NHẤT một JSON tiếng Việt:\n"
        '{"reply":"câu trả lời hữu ích, cụ thể cho admin",'
        '"action":null hoặc {"type":"product","data":{"name","description","categoryHint","metaTitle","metaDesc"}}'
        ' hoặc {"type":"post","data":{"title","excerpt","content","metaTitle","metaDesc"}}}\n'
        "Chỉ đặt action khi admin RÕ RÀNG muốn tạo sản phẩm/bài viết. content bài viết là Markdown ~400 từ. "
        "categoryHint là tên danh mục phù hợp nhất. Nếu chỉ hỏi/đáp/tư vấn thì action=null."
    )
    try:
        r = await llm.ainvoke([HumanMessage(content=[{"type": "text", "text": instr}])])
        _record_usage(r)
        data = _parse_json(_text(r))
    except Exception:  # noqa: BLE001
        logger.exception("assistant lỗi")
        raise HTTPException(status_code=502, detail="Trợ lý AI lỗi, thử lại.")
    reply = str(data.get("reply") or "Mình chưa rõ ý bạn, bạn nói lại giúp nhé.")
    action = data.get("action") if isinstance(data.get("action"), dict) else None
    return {"ok": True, "reply": reply, "action": action}
