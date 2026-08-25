"""DeepAgents: kho SKILL, kho MCP, và các helper chuyển event ra SSE."""

import pytest

from app.deep import mcp_store, skills_store
from app.services.chat_service import (
    _preview,
    _todos_from_tool_input,
    _tool_input_preview,
    _tool_output_preview,
)


@pytest.fixture(autouse=True)
def _isolate(tmp_path, monkeypatch):
    monkeypatch.setattr(skills_store, "_path", lambda: tmp_path / "skills.local.json")
    monkeypatch.setattr(mcp_store, "_path", lambda: tmp_path / "mcp_servers.local.json")
    yield


# ── SKILL store ──────────────────────────────────────────────────────────────
def test_slugify_bo_dau_tieng_viet():
    assert skills_store.slugify("Báo giá sỉ") == "bao-gia-si"
    assert skills_store.slugify("  Quy cách!! ") == "quy-cach"
    assert skills_store.slugify("###") == "skill"


def test_upsert_and_list():
    skills_store.upsert_skill("Báo giá sỉ", "Quy trình báo giá", "Giảm 10% từ 100 cái.")
    items = skills_store.list_skills()
    assert len(items) == 1
    assert items[0]["slug"] == "bao-gia-si"
    assert items[0]["enabled"] is True


def test_upsert_ghi_de_theo_slug():
    skills_store.upsert_skill("Báo giá sỉ", "v1", "noi dung 1")
    skills_store.upsert_skill("báo giá SỈ", "v2", "noi dung 2")  # cùng slug
    items = skills_store.list_skills()
    assert len(items) == 1
    assert items[0]["description"] == "v2"


def test_upsert_thieu_ten_bi_chan():
    with pytest.raises(ValueError):
        skills_store.upsert_skill("  ", "x", "y")


def test_to_files_shape_dung_cho_deepagents():
    skills_store.upsert_skill("Báo giá sỉ", "Quy trình", "Giảm 10% từ 100 cái.")
    files = skills_store.to_files()
    path = "/skills/bao-gia-si/SKILL.md"
    assert path in files
    assert files[path]["encoding"] == "utf-8"
    body = files[path]["content"]
    # name PHẢI là slug thường-gạch-nối (chuẩn Agent Skills), tên tiếng Việt có dấu
    # được đưa vào description để model vẫn đọc ra
    assert body.startswith("---\nname: bao-gia-si\n")
    assert "description: Báo giá sỉ. Quy trình" in body
    assert "Giảm 10% từ 100 cái." in body


def test_default_skills_dung_chuan_agent_skills():
    """SKILL viết sẵn của VHD phải qua được kiểm tra spec (name slug) như skill admin."""
    import re

    from app.deep import default_skills

    files = default_skills.to_files()
    assert len(files) >= 5
    for path, data in files.items():
        first_line = data["content"].splitlines()[1]  # dòng sau '---'
        name = first_line.removeprefix("name:").strip()
        assert re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", name), f"{path} có name không hợp lệ: {name}"
        assert data["encoding"] == "utf-8"


def test_to_files_bo_skill_tat_va_skill_rong():
    skills_store.upsert_skill("Tắt", "d", "co noi dung", enabled=False)
    skills_store.upsert_skill("Rỗng", "d", "   ")  # bật nhưng không nội dung
    assert skills_store.to_files() == {}


def test_delete_skill():
    skills_store.upsert_skill("Báo giá sỉ", "d", "c")
    assert skills_store.delete_skill("bao-gia-si") is True
    assert skills_store.delete_skill("bao-gia-si") is False
    assert skills_store.list_skills() == []


# ── MCP store ────────────────────────────────────────────────────────────────
def test_mcp_upsert_va_list():
    mcp_store.upsert_server("weather", "https://mcp.example.com/mcp")
    servers = mcp_store.list_servers()
    assert len(servers) == 1
    assert servers[0]["transport"] == "streamable_http"


def test_mcp_chan_stdio_va_scheme_la():
    """Không cho transport stdio / URL lạ → admin UI không thành đường chạy lệnh trên máy chủ."""
    for bad in ("stdio:///bin/sh", "file:///etc/passwd", "npx -y some-server", ""):
        with pytest.raises(ValueError):
            mcp_store.upsert_server("x", bad)


def test_mcp_chan_transport_la():
    with pytest.raises(ValueError):
        mcp_store.upsert_server("x", "https://a.com/mcp", transport="stdio")


def test_mcp_delete():
    mcp_store.upsert_server("weather", "https://mcp.example.com/mcp")
    assert mcp_store.delete_server("weather") is True
    assert mcp_store.delete_server("weather") is False


@pytest.mark.asyncio
async def test_mcp_load_tools_khong_co_server_tra_rong():
    assert await mcp_store.load_tools() == []


# ── Helper chuyển event DeepAgents → SSE ─────────────────────────────────────
def test_todos_chi_lay_tu_write_todos():
    assert _todos_from_tool_input("search_products", {"query": "x"}) is None
    assert _todos_from_tool_input("write_todos", {"todos": []}) == []


def test_todos_chuan_hoa_status_la():
    got = _todos_from_tool_input(
        "write_todos",
        {"todos": [
            {"content": "Tìm SP", "status": "in_progress"},
            {"content": "Xong", "status": "completed"},
            {"content": "Lạ", "status": "khong-hop-le"},
            {"content": "   ", "status": "pending"},  # rỗng → bỏ
            "khong-phai-dict",
        ]},
    )
    assert got == [
        {"content": "Tìm SP", "status": "in_progress"},
        {"content": "Xong", "status": "completed"},
        {"content": "Lạ", "status": "pending"},  # status lạ → về pending
    ]


def test_preview_gioi_han_do_dai_va_gom_khoang_trang():
    assert _preview(None) == ""
    assert _preview("a\n\n  b") == "a b"
    long = _preview("x" * 5000)
    assert len(long) <= 601 and long.endswith("…")


def test_preview_dict_thanh_json():
    assert _tool_input_preview({"query": "gioăng"}) == '{"query": "gioăng"}'


def test_tool_output_preview_lay_content_cua_tool_message():
    class FakeToolMessage:
        content = "Kết quả tra cứu"

    assert _tool_output_preview(FakeToolMessage()) == "Kết quả tra cứu"
