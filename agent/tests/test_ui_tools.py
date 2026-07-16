"""Gen-UI (§9.2): tool render ghi lệnh vào channel + ChatService emit event `ui`."""

import json

from app.tools import ui
from app.tools.products import load_catalog


def setup_module():
    load_catalog(force=True)


async def _drain(coro):
    """Set channel, chạy tool, trả về (note, list lệnh render)."""
    queue: list[dict] = []
    token = ui.set_ui_queue(queue)
    try:
        note = await coro
    finally:
        ui.reset_ui_queue(token)
    return note, queue


async def test_show_product_carousel_emits_props():
    note, queue = await _drain(ui.show_product_carousel.ainvoke({"query": "cao su"}))
    assert len(queue) == 1
    cmd = queue[0]
    assert cmd["component"] == "product-carousel"
    products = cmd["props"]["products"]
    assert products, "phải tìm được ít nhất 1 sản phẩm cao su"
    p = products[0]
    # Props schema đúng §9.2 + originalPrice (giá gốc khi đang khuyến mãi)
    assert set(p) == {"id", "name", "price", "originalPrice", "image", "slug", "stock", "category"}
    assert isinstance(p["price"], (int, float))  # price là số VND (đã áp KM nếu có)
    assert p["slug"]
    assert "carousel" in note.lower()


async def test_show_contact_form_emits():
    note, queue = await _drain(ui.show_contact_form.ainvoke({"reason": "cần tư vấn ống nhựa"}))
    assert queue[0]["component"] == "contact-form"
    assert queue[0]["props"]["prefill"]["message"] == "cần tư vấn ống nhựa"


async def test_show_quote_form_emits_with_product():
    note, queue = await _drain(ui.show_quote_form.ainvoke({"product_name": "ống nhựa PVC D21"}))
    cmd = queue[0]
    assert cmd["component"] == "quote-request"
    assert cmd["props"]["product"]
    assert cmd["props"]["products"]


async def test_show_comparison_emits_table():
    note, queue = await _drain(
        ui.show_comparison.ainvoke(
            {"product_names": ["Ống nhựa PVC D21", "Tấm cao su non chống rung"]}
        )
    )
    cmd = queue[0]
    assert cmd["component"] == "comparison-table"
    assert len(cmd["props"]["headers"]) == 3  # Tiêu chí + 2 sản phẩm
    labels = [r["label"] for r in cmd["props"]["rows"]]
    assert "Giá" in labels


async def test_show_faq_emits_items():
    note, queue = await _drain(ui.show_faq.ainvoke({}))
    cmd = queue[0]
    assert cmd["component"] == "faq"
    items = cmd["props"]["items"]
    assert len(items) >= 4
    assert all("question" in it and "answer" in it for it in items)


async def test_chat_emits_ui_event_for_product_request(client):
    """API e2e: khách xin xem sản phẩm → luồng SSE có event `ui` product-carousel (Gemini thật)."""
    events = []
    payload = {"message": "Cho tôi xem vài sản phẩm cao su của bên bạn"}
    async with client.stream("POST", "/api/chat", json=payload, headers={"X-Chat-User": "ui-test"}) as resp:
        assert resp.status_code == 200
        async for line in resp.aiter_lines():
            if line.startswith("data: "):
                events.append(json.loads(line[len("data: "):]))

    types = [e["type"] for e in events]
    assert "error" not in types
    assert "done" in types
    ui_events = [e for e in events if e["type"] == "ui"]
    assert ui_events, f"mong đợi ít nhất 1 event ui, nhận: {types}"
    assert any(e["component"] == "product-carousel" for e in ui_events)
