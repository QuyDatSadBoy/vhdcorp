"""Voice TTS proxy (§9.3): POST /api/tts → MP3 bytes (gọi MiniMax thật)."""

import pytest


async def test_tts_returns_mp3(client):
    from app.core.config import get_settings

    if not get_settings().minimax_api_key:
        pytest.skip("Chưa cấu hình MINIMAX_API_KEY")

    resp = await client.post("/api/tts", json={"text": "Xin chào từ VHD Corp"})
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "audio/mpeg"
    assert len(resp.content) > 1000  # MP3 hợp lệ, không rỗng


async def test_tts_rejects_empty(client):
    resp = await client.post("/api/tts", json={"text": ""})
    assert resp.status_code == 422  # min_length=1 của pydantic
