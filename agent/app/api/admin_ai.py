"""AI trợ lý admin: đọc ảnh (Gemini Vision) + web search (Tavily) → viết mô tả
sản phẩm / dàn ý bài viết. Bảo vệ bằng header X-Admin-Secret (như các admin API khác)."""

import json
import logging
import re

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel

from app.api.chat import SSE_HEADERS, _sse
from app.core.config import get_settings
from app.core.security import require_admin
from app.deep.admin_agent import admin_skill_files, get_admin_agent
from app.services.chat_service import (
    _chunk_text,
    _todos_from_tool_input,
    _tool_input_preview,
    _tool_output_preview,
)
from app.tools.web_search import _tavily_search
from app.core import usage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/ai")

BRAND = (
    "VHD Corp là KHO TỔNG bán sỉ vật tư ngành ĐIỆN LẠNH & CƠ ĐIỆN (M&E) và là nhà sản xuất "
    "KHUÔN MẪU, ĐÚC NHỰA, phục vụ khách trong nước. Giá sản phẩm luôn là 'Liên hệ báo giá'. "
    "Văn phong tiếng Việt, chuẩn xác, súc tích, KHÔNG phóng đại/chém gió."
)


def _check(secret: str | None) -> None:
    require_admin(secret)  # hằng thời gian + fail-closed (xem app/core/security.py)


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
    if not m:
        return {}
    for strict in (True, False):
        # strict=False: chấp nhận XUỐNG DÒNG THẬT trong chuỗi — model hay xuống dòng
        # trong description/content markdown thay vì escape \n (đo thật, hỏng ~1/3 lượt).
        try:
            return json.loads(m.group(0), strict=strict)
        except Exception:  # noqa: BLE001
            continue
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


# Yêu cầu định dạng cho lượt KHÔNG stream: tin nhắn cuối phải là JSON để FE lấy `action`.
# (Bản stream không dùng khối này — ở đó FE cần văn bản chảy ra tự nhiên.)
_JSON_FORMAT = (
    "\n\n[Hệ thống — không phải lời admin] Tra cứu bằng tool trước nếu cần dữ liệu thật. "
    "Tin nhắn CUỐI CÙNG của bạn phải là DUY NHẤT một JSON tiếng Việt, không kèm chữ nào khác:\n"
    '{"reply":"câu trả lời cho admin (markdown được)",'
    '"action":null hoặc {"type":"product","data":{"name","description","categoryHint","metaTitle","metaDesc"}}'
    ' hoặc {"type":"post","data":{"title","excerpt","content","metaTitle","metaDesc"}}}\n'
    "Chỉ đặt action khi admin RÕ RÀNG muốn tạo sản phẩm/bài viết; còn lại action=null."
)


def _agent_input(body: AssistantReq, json_format: bool) -> dict:
    """Hội thoại admin → input cho deep agent (kèm SKILL admin)."""
    msgs: list = []
    for m in body.messages[-8:]:
        cls = AIMessage if m.role == "assistant" else HumanMessage
        msgs.append(cls(content=m.content))

    extra = ""
    if body.categories:
        extra += "\n\n[Danh mục hiện có trên web]: " + ", ".join(body.categories)
    if json_format:
        extra += _JSON_FORMAT
    if extra:
        last = msgs[-1]
        if isinstance(last, HumanMessage):
            msgs[-1] = HumanMessage(content=str(last.content) + extra)
        else:
            msgs.append(HumanMessage(content=extra.strip()))

    try:
        files = admin_skill_files()
    except Exception:  # noqa: BLE001 — skill lỗi thì chạy không skill, đừng chết chat
        logger.exception("Không nạp được skill admin")
        files = {}
    return {"messages": msgs, "files": files}


# Mỗi vòng model⇄tool của DeepAgents đi qua ~8 node (model, tools + các middleware),
# nên mức mặc định 25 của LangGraph hết sạch sau 3-4 lần gọi tool (đo thật: câu "soạn mô
# tả cho X" chết giữa chừng). Chốt chặn thật vẫn là ModelCallLimit(12)/ToolCallLimit(15)
# trong builder — số này chỉ để chúng kịp chạy trước.
_RECURSION_LIMIT = 100
_CONFIG = {"recursion_limit": _RECURSION_LIMIT}


def _record_deep_usage(messages: list) -> None:
    """Cộng token thật của MỌI vòng gọi model trong 1 lần chạy deep agent."""
    itok = otok = 0
    model = ""
    for m in messages:
        um = getattr(m, "usage_metadata", None) or {}
        itok += int(um.get("input_tokens", 0) or 0)
        otok += int(um.get("output_tokens", 0) or 0)
        model = (getattr(m, "response_metadata", None) or {}).get("model_name") or model
    if itok or otok:
        usage.record_request(model or get_settings().agent_model, itok, otok)


@router.post("/assistant")
async def assistant(
    body: AssistantReq,
    x_admin_secret: str = Header(None, alias="X-Admin-Secret"),
):
    """Trợ lý admin chạy bằng LÕI DeepAgents (tool tra cứu thật + SKILL admin).
    Giữ nguyên hợp đồng cũ: trả {ok, reply, action?}.
    KHÔNG tự ghi DB — FE hiển thị nháp để admin DUYỆT rồi mới tạo (bằng quyền admin)."""
    _check(x_admin_secret)
    if not body.messages:
        raise HTTPException(status_code=400, detail="Thiếu nội dung chat.")
    try:
        result = await get_admin_agent().ainvoke(_agent_input(body, json_format=True), config=_CONFIG)
    except Exception:  # noqa: BLE001
        logger.exception("assistant lỗi")
        raise HTTPException(status_code=502, detail="Trợ lý AI lỗi, thử lại.")

    msgs = result.get("messages", [])
    _record_deep_usage(msgs)
    text = next((_chunk_text(m) for m in reversed(msgs) if isinstance(m, AIMessage) and _chunk_text(m)), "")
    data = _parse_json(text)
    # Model quên bọc JSON → vẫn trả nguyên văn cho admin thay vì báo lỗi
    reply = str(data.get("reply") or "").strip() or text.strip() or "Mình chưa rõ ý bạn, bạn nói lại giúp nhé."
    action = data.get("action") if isinstance(data.get("action"), dict) else None
    return {"ok": True, "reply": reply, "action": action}


@router.post("/assistant/stream")
async def assistant_stream(
    body: AssistantReq,
    x_admin_secret: str = Header(None, alias="X-Admin-Secret"),
):
    """Như /assistant nhưng SSE: message.delta / tool.start / tool.end / todo / done / error
    (đúng bộ event của chat khách để FE admin hiện kế hoạch + log tool)."""
    _check(x_admin_secret)
    if not body.messages:
        raise HTTPException(status_code=400, detail="Thiếu nội dung chat.")
    agent_input = _agent_input(body, json_format=False)

    async def event_stream():
        parts: list[str] = []
        itok = otok = 0
        model = ""
        try:
            async for event in get_admin_agent().astream_events(agent_input, config=_CONFIG, version="v2"):
                kind = event["event"]
                if kind == "on_chat_model_stream":
                    text = _chunk_text(event["data"]["chunk"])
                    if text:
                        parts.append(text)
                        yield _sse({"type": "message.delta", "content": text})
                elif kind == "on_chat_model_end":
                    msg = event.get("data", {}).get("output")
                    um = getattr(msg, "usage_metadata", None) or {}
                    itok += int(um.get("input_tokens", 0) or 0)
                    otok += int(um.get("output_tokens", 0) or 0)
                    model = (getattr(msg, "response_metadata", None) or {}).get("model_name") or model
                elif kind == "on_tool_start":
                    name = event.get("name", "")
                    todos = _todos_from_tool_input(name, event.get("data", {}).get("input"))
                    if todos is not None:
                        yield _sse({"type": "todo", "items": todos})
                        continue
                    yield _sse({
                        "type": "tool.start",
                        "name": name,
                        "input": _tool_input_preview(event.get("data", {}).get("input")),
                    })
                elif kind == "on_tool_end":
                    name = event.get("name", "")
                    if name == "write_todos":
                        continue  # đã bắn event todo ở on_tool_start
                    yield _sse({
                        "type": "tool.end",
                        "name": name,
                        "output": _tool_output_preview(event.get("data", {}).get("output")),
                    })
        except Exception as exc:  # noqa: BLE001 — luôn trả event error cho client
            logger.exception("assistant/stream lỗi")
            yield _sse({"type": "error", "message": f"Trợ lý AI lỗi: {exc}"})
            return
        if itok or otok:
            usage.record_request(model or get_settings().agent_model, itok, otok)
        yield _sse({"type": "done", "reply": "".join(parts)})

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=SSE_HEADERS)
