"""GET /api/health — trạng thái service + model + số sản phẩm đã nạp."""

from fastapi import APIRouter

from app.core.config import get_settings
from app.tools.products import catalog_size

router = APIRouter()


@router.get("/api/agent-mode")
async def agent_mode_public():
    """Chế độ trợ lý đang chạy — khung chat hiện cho khách biết mình hỏi được tới đâu.

    Công khai (không cần khoá) vì đây là thứ khách phải thấy để biết khả năng của trợ
    lý; chỉ trả nhãn và mô tả, KHÔNG trả luật riêng của cửa hàng (đó là chuyện nội bộ).
    """
    from app.deep import agent_mode

    state = agent_mode.get_state()
    return {"mode": state["mode"], "label": state["label"], "hint": state["hint"]}


@router.get("/api/health")
async def health():
    settings = get_settings()
    return {
        "status": "ok",
        "model": settings.agent_model,
        "products_loaded": catalog_size(),
    }
