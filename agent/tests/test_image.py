import pytest
"""Image search (§9.4): POST /api/chat kèm `image` → emit ui image-search-result.

Mock vision (mô tả ảnh) để test ổn định; lời trả lời vẫn qua Gemini thật.
"""

import base64
import io
import json

from PIL import Image


def _green_jpeg_data_url() -> str:
    """Tạo ảnh JPEG nền xanh 300x300, encode base64 → data URL."""
    img = Image.new("RGB", (300, 300), (20, 140, 90))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/jpeg;base64,{b64}"


@pytest.mark.live
async def test_image_chat_emits_image_search_result(client, monkeypatch):
    # Mock mô tả ảnh → trả từ khóa khớp catalog để search có kết quả
    from app.services import vision

    async def fake_describe(llm, image_data_url):
        assert image_data_url.startswith("data:image/jpeg;base64,")
        return "ống nhựa PVC"

    monkeypatch.setattr(vision, "describe_image", fake_describe)

    payload = {"message": "Sản phẩm này là gì?", "image": _green_jpeg_data_url()}
    events = []
    async with client.stream(
        "POST", "/api/chat", json=payload, headers={"X-Chat-User": "img-test"}
    ) as resp:
        assert resp.status_code == 200
        async for line in resp.aiter_lines():
            if line.startswith("data: "):
                events.append(json.loads(line[len("data: "):]))

    types = [e["type"] for e in events]
    assert "error" not in types
    assert "done" in types
    ui_events = [e for e in events if e["type"] == "ui"]
    assert any(e["component"] == "image-search-result" for e in ui_events)
    isr = next(e for e in ui_events if e["component"] == "image-search-result")
    assert isr["props"]["query"] == "ống nhựa PVC"
    assert isr["props"]["products"], "phải map được sang sản phẩm ống nhựa"
