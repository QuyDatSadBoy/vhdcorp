import sys
from pathlib import Path

import httpx
import pytest

AGENT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AGENT_DIR))


@pytest.fixture
async def test_app(tmp_path, monkeypatch):
    """App FastAPI với DB tạm (chat + checkpoint) — lifespan chạy thật."""
    monkeypatch.setenv("CHAT_DB_PATH", str(tmp_path / "chat.db"))
    monkeypatch.setenv("CHECKPOINT_DB_PATH", str(tmp_path / "checkpoints.sqlite"))

    from app.core.config import get_settings

    get_settings.cache_clear()
    from app.main import create_app

    app = create_app()
    async with app.router.lifespan_context(app):
        yield app
    get_settings.cache_clear()


@pytest.fixture
async def client(test_app):
    """HTTP client gắn vào ASGI app (dùng chung cho các test API)."""
    transport = httpx.ASGITransport(app=test_app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://test", timeout=120
    ) as c:
        yield c
