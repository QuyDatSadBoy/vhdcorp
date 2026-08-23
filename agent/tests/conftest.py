import shutil
import sys
import tempfile
from pathlib import Path

import httpx
import pytest

AGENT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AGENT_DIR))

# Catalog cho test LUÔN là fixture cố định, kể cả khi máy có data/products.json.
# Trước đây chỉ dùng fixture khi thiếu file runtime, nên hễ kho thật thay đổi (đồng bộ
# lại từ production, admin thêm/xoá hàng) là một loạt test đỏ dù code không đụng gì —
# test phải tất định, còn dữ liệu thật đã có bộ kiểm thử đầu-cuối lo.
import os

# Trỏ vào BẢN SAO tạm chứ không vào chính file fixture: khi service khởi động nó tự
# đồng bộ catalog và GHI ĐÈ đường dẫn này. Trỏ thẳng vào fixture thì chạy test trên
# máy đang bật backend sẽ nuốt mất dữ liệu mẫu — test tự phá dữ liệu của chính nó.
_FIXTURE = Path(__file__).parent / "fixtures" / "products.json"
_TMP_CATALOG = Path(tempfile.gettempdir()) / "vhd-test-products.json"
shutil.copyfile(_FIXTURE, _TMP_CATALOG)
os.environ["PRODUCTS_JSON_PATH"] = str(_TMP_CATALOG)
# Đọc trực tiếp PostgreSQL cũng sẽ đè lên catalog mẫu → tắt trong test.
os.environ["CATALOG_DATABASE_URL"] = ""
# Không cho vòng đồng bộ lúc khởi động gọi ra backend thật.
os.environ["BE_API_URL"] = "http://127.0.0.1:1/api"
from app.core.config import get_settings as _gs

_gs.cache_clear()


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
