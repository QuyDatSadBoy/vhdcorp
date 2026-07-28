"""Voice TTS proxy (§9.3): POST /api/tts → audio bytes.

Chính = PTIT holobox (WAV), dự phòng = MiniMax (MP3). Gọi service THẬT nên bỏ qua
nếu môi trường test không với tới được cả hai (502).
"""

import pytest


async def test_tts_returns_audio(client):
    resp = await client.post("/api/tts", json={"text": "Xin chào từ VHD Corp"})
    if resp.status_code == 502:
        pytest.skip("Không gọi được TTS (PTIT + MiniMax) trong môi trường test")
    assert resp.status_code == 200
    assert resp.headers["content-type"] in ("audio/wav", "audio/mpeg")
    assert len(resp.content) > 1000  # audio hợp lệ, không rỗng


async def test_tts_rejects_empty(client):
    resp = await client.post("/api/tts", json={"text": ""})
    assert resp.status_code == 422  # min_length=1 của pydantic
