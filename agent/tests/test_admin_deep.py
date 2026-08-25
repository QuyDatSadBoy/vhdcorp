"""Trợ lý ADMIN chạy bằng lõi DeepAgents: bộ tool, skill, hợp đồng API, SSE."""

import json
import re

import pytest
from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage

from app.deep import admin_agent

# Tool giao diện KHÁCH (render card bán hàng / form) — admin không được có
_CLIENT_ONLY = {
    "show_product_carousel",
    "show_contact_form",
    "show_quote_form",
    "show_comparison",
    "show_faq",
    "add_to_cart",
    "send_contact_request",
    "create_quote_request",
}


def _fake_model() -> GenericFakeChatModel:
    return GenericFakeChatModel(messages=iter([]))


def _compiled_tool_names(agent) -> set[str]:
    return set(agent.nodes["tools"].bound.tools_by_name)


@pytest.fixture(autouse=True)
def _clear_agent_cache():
    admin_agent.reset_admin_agent()
    yield
    admin_agent.reset_admin_agent()


# ── Bộ tool ──────────────────────────────────────────────────────────────────
def test_admin_tools_dung_danh_sach_mong_muon():
    names = [t.name for t in admin_agent.admin_tools()]
    assert names == list(admin_agent.ADMIN_TOOL_NAMES)


def test_admin_agent_dung_duoc_va_du_tool():
    agent = admin_agent.build_admin_agent([_fake_model()], admin_agent.admin_tools())
    tools = _compiled_tool_names(agent)
    assert set(admin_agent.ADMIN_TOOL_NAMES) <= tools
    # tool hệ thống của DeepAgents vẫn có (chỉ-đọc + lập kế hoạch + subagent)
    assert {"read_file", "ls", "glob", "grep", "write_todos", "task"} <= tools


def test_admin_agent_khong_lan_tool_giao_dien_khach():
    agent = admin_agent.build_admin_agent([_fake_model()], admin_agent.admin_tools())
    assert _compiled_tool_names(agent) & _CLIENT_ONLY == set()


def test_get_admin_agent_chi_dung_mot_lan(monkeypatch):
    """Cache: dựng graph là việc đắt → chỉ được biên dịch 1 lần cho cả tiến trình."""
    import app.graph.builder as gb

    built: list[int] = []

    class FakeBuilder:
        def __init__(self, settings, extra_tools=None):
            built.append(1)
            self.model_chain = [_fake_model()]

    monkeypatch.setattr(gb, "ChatGraphBuilder", FakeBuilder)
    first = admin_agent.get_admin_agent()
    assert admin_agent.get_admin_agent() is first
    assert len(built) == 1


# ── SKILL admin ──────────────────────────────────────────────────────────────
def test_admin_skill_files_nap_duoc():
    files = admin_agent.admin_skill_files()
    assert len(files) >= 3
    assert all(p.startswith("/skills/") and p.endswith("/SKILL.md") for p in files)
    for path, data in files.items():
        name = data["content"].splitlines()[1].removeprefix("name:").strip()
        assert re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", name), f"{path}: name không hợp lệ"


def test_admin_skill_frontmatter_la_yaml_hop_le():
    """DeepAgents parse frontmatter bằng YAML: dấu ':' không escape → skill bị BỎ QUA
    im lặng (đã dính thật với ra-soat-kho-hang)."""
    import yaml

    for path, data in admin_agent.admin_skill_files().items():
        meta = yaml.safe_load(data["content"].split("---", 2)[1])
        assert isinstance(meta, dict), f"{path}: frontmatter không phải mapping"
        assert meta.get("name") and meta.get("description"), f"{path}: thiếu name/description"


def test_admin_skill_khac_skill_khach():
    from app.deep import default_skills

    assert admin_agent.admin_skill_files() != default_skills.to_files()


# ── Parse JSON của tin nhắn cuối ─────────────────────────────────────────────
def test_parse_json_chap_nhan_xuong_dong_that_trong_chuoi():
    """Model hay xuống dòng thật trong description markdown thay vì escape \\n."""
    from app.api.admin_ai import _parse_json

    raw = '```json\n{"reply":"Dòng 1\nDòng 2","action":null}\n```'
    assert _parse_json(raw)["reply"] == "Dòng 1\nDòng 2"


def test_parse_json_bo_qua_text_khong_phai_json():
    from app.api.admin_ai import _parse_json

    assert _parse_json("Kho có 12 sản phẩm.") == {}


# ── Bảo vệ bằng X-Admin-Secret (fail-closed) ─────────────────────────────────
_BODY = {"messages": [{"role": "user", "content": "kho có bao nhiêu sản phẩm?"}]}


@pytest.mark.parametrize("path", ["/api/admin/ai/assistant", "/api/admin/ai/assistant/stream"])
async def test_assistant_can_secret(client, monkeypatch, path):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "admin_secret", "test-admin")
    assert (await client.post(path, json=_BODY)).status_code == 403
    assert (
        await client.post(path, json=_BODY, headers={"X-Admin-Secret": "wrong"})
    ).status_code == 403


@pytest.mark.parametrize("path", ["/api/admin/ai/assistant", "/api/admin/ai/assistant/stream"])
async def test_assistant_fail_closed_khi_chua_dat_secret(client, monkeypatch, path):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "admin_secret", "")
    assert (await client.post(path, json=_BODY)).status_code == 403
    assert (
        await client.post(path, json=_BODY, headers={"X-Admin-Secret": ""})
    ).status_code == 403


# ── Hợp đồng API (agent giả lập — không gọi LLM thật) ────────────────────────
class _FakeAgent:
    """Agent giả: trả 1 AIMessage cố định / phát lại chuỗi event của astream_events."""

    def __init__(self, final_text: str = "", events: list[dict] | None = None) -> None:
        self.final_text = final_text
        self.events = events or []
        self.last_input: dict | None = None

    async def ainvoke(self, payload, config=None):
        self.last_input = payload
        self.config = config
        return {"messages": [AIMessage(content=self.final_text)]}

    async def astream_events(self, payload, config=None, version="v2"):
        self.last_input = payload
        self.config = config
        for ev in self.events:
            yield ev


@pytest.fixture
def admin_headers(monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "admin_secret", "test-admin")
    return {"X-Admin-Secret": "test-admin"}


async def test_assistant_parse_json_thanh_reply_va_action(client, monkeypatch, admin_headers):
    from app.api import admin_ai

    fake = _FakeAgent(
        final_text='```json\n{"reply":"Đã soạn nháp.","action":{"type":"product",'
        '"data":{"name":"Gioăng cao su"}}}\n```'
    )
    monkeypatch.setattr(admin_ai, "get_admin_agent", lambda: fake)
    resp = await client.post(
        "/api/admin/ai/assistant",
        json={"messages": [{"role": "user", "content": "soạn mô tả gioăng cao su"}], "categories": ["Gioăng"]},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body == {
        "ok": True,
        "reply": "Đã soạn nháp.",
        "action": {"type": "product", "data": {"name": "Gioăng cao su"}},
    }
    # SKILL admin được nạp vào state; danh mục được ghép vào tin nhắn cuối
    assert any(p.startswith("/skills/") for p in fake.last_input["files"])
    assert "Gioăng" in str(fake.last_input["messages"][-1].content)
    # 25 (mặc định LangGraph) không đủ cho vòng model⇄tool + middleware của DeepAgents
    assert fake.config["recursion_limit"] >= 50


async def test_assistant_model_quen_json_van_tra_nguyen_van(client, monkeypatch, admin_headers):
    from app.api import admin_ai

    monkeypatch.setattr(admin_ai, "get_admin_agent", lambda: _FakeAgent(final_text="Kho có 12 sản phẩm."))
    resp = await client.post("/api/admin/ai/assistant", json=_BODY, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json() == {"ok": True, "reply": "Kho có 12 sản phẩm.", "action": None}


async def test_assistant_thieu_messages_tra_400(client, admin_headers):
    for path in ("/api/admin/ai/assistant", "/api/admin/ai/assistant/stream"):
        resp = await client.post(path, json={"messages": []}, headers=admin_headers)
        assert resp.status_code == 400


async def test_assistant_stream_bat_du_loai_event(client, monkeypatch, admin_headers):
    from app.api import admin_ai
    from langchain_core.messages import AIMessageChunk

    events = [
        {
            "event": "on_tool_start",
            "name": "write_todos",
            "data": {"input": {"todos": [{"content": "Tra kho", "status": "in_progress"}]}},
        },
        {"event": "on_tool_end", "name": "write_todos", "data": {"output": "ok"}},
        {"event": "on_tool_start", "name": "search_products", "data": {"input": {"query": "cao su"}}},
        {"event": "on_tool_end", "name": "search_products", "data": {"output": "Tìm thấy 3 sản phẩm"}},
        {"event": "on_chat_model_stream", "data": {"chunk": AIMessageChunk(content="Kho có ")}},
        {"event": "on_chat_model_stream", "data": {"chunk": AIMessageChunk(content="3 sản phẩm.")}},
        {
            "event": "on_chat_model_end",
            "data": {
                "output": AIMessage(
                    content="Kho có 3 sản phẩm.",
                    usage_metadata={"input_tokens": 10, "output_tokens": 5, "total_tokens": 15},
                    response_metadata={"model_name": "fake-model"},
                )
            },
        },
    ]
    monkeypatch.setattr(admin_ai, "get_admin_agent", lambda: _FakeAgent(events=events))

    resp = await client.post("/api/admin/ai/assistant/stream", json=_BODY, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/event-stream")
    got = [json.loads(line[6:]) for line in resp.text.splitlines() if line.startswith("data: ")]
    kinds = [e["type"] for e in got]
    assert kinds == [
        "todo",
        "tool.start",
        "tool.end",
        "message.delta",
        "message.delta",
        "done",
    ]
    assert got[0]["items"] == [{"content": "Tra kho", "status": "in_progress"}]
    assert got[1]["input"] == '{"query": "cao su"}'
    assert got[2]["output"] == "Tìm thấy 3 sản phẩm"
    assert got[-1]["reply"] == "Kho có 3 sản phẩm."


async def test_assistant_stream_loi_tra_event_error(client, monkeypatch, admin_headers):
    from app.api import admin_ai

    class Boom:
        async def astream_events(self, payload, config=None, version="v2"):
            raise RuntimeError("model chết")
            yield  # pragma: no cover — biến hàm thành async generator

    monkeypatch.setattr(admin_ai, "get_admin_agent", lambda: Boom())
    resp = await client.post("/api/admin/ai/assistant/stream", json=_BODY, headers=admin_headers)
    assert resp.status_code == 200
    got = [json.loads(line[6:]) for line in resp.text.splitlines() if line.startswith("data: ")]
    assert got[-1]["type"] == "error" and "model chết" in got[-1]["message"]
