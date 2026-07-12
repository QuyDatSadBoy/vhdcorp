"""GET /api/health — trạng thái service + model + số sản phẩm đã nạp."""

from fastapi import APIRouter

from app.core.config import get_settings
from app.tools.products import catalog_size

router = APIRouter()


@router.get("/api/health")
async def health():
    settings = get_settings()
    return {
        "status": "ok",
        "model": settings.agent_model,
        "products_loaded": catalog_size(),
    }
