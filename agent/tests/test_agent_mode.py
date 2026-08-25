"""Chế độ hoạt động: admin đổi phạm vi trợ lý, khách nhìn thấy mình đang nói với ai."""

import pytest

from app.deep import agent_mode as am


@pytest.fixture(autouse=True)
def _isolate(tmp_path, monkeypatch):
    monkeypatch.setattr(am, "_path", lambda: tmp_path / "agent_mode.local.json")
    monkeypatch.setattr(am, "_cache", None, raising=False)
    yield


def test_mac_dinh_la_tieu_chuan():
    assert am.get_mode() == "tieu_chuan"
    assert am.get_rules() == []


def test_doi_che_do_va_giu_lai():
    am.save(mode="mo_rong")
    assert am.get_mode() == "mo_rong"
    am._cache = None  # buộc đọc lại từ đĩa
    assert am.get_mode() == "mo_rong"


def test_che_do_khong_hop_le_bi_tu_choi():
    with pytest.raises(ValueError):
        am.save(mode="sieu_cap")
    assert am.get_mode() == "tieu_chuan"  # giữ nguyên, không hỏng cấu hình


def test_luat_rieng_duoc_cat_va_loc():
    am.save(rules=["  Luôn chào bằng tên cửa hàng  ", "", "   ", "x" * 500])
    rules = am.get_rules()
    assert len(rules) == 2                      # bỏ chuỗi rỗng/toàn khoảng trắng
    assert rules[0] == "Luôn chào bằng tên cửa hàng"
    assert len(rules[1]) == am._MAX_RULE_LEN    # cắt luật quá dài


def test_gioi_han_so_luat():
    am.save(rules=[f"luật {i}" for i in range(50)])
    assert len(am.get_rules()) == am._MAX_RULES


@pytest.mark.parametrize("mode,phai_co", [
    ("chat_chan", "CHỈ trả lời việc của VHD"),
    ("tieu_chuan", "là chính"),
    ("mo_rong", "đa năng"),
])
def test_chi_dan_doi_theo_che_do(mode, phai_co):
    am.save(mode=mode)
    assert phai_co in am.prompt_block()


def test_luat_rieng_ghep_vao_chi_dan():
    am.save(mode="tieu_chuan", rules=["Không hứa giao trong ngày"])
    block = am.prompt_block()
    assert "LUẬT RIÊNG" in block
    assert "Không hứa giao trong ngày" in block


def test_trang_thai_du_cho_giao_dien():
    st = am.get_state()
    assert st["label"] and st["hint"]
    assert [m["id"] for m in st["modes"]] == list(am.MODES)


def test_file_hong_thi_ve_mac_dinh(tmp_path, monkeypatch):
    bad = tmp_path / "agent_mode.local.json"
    bad.write_text("{ đây không phải json", encoding="utf-8")
    monkeypatch.setattr(am, "_path", lambda: bad)
    monkeypatch.setattr(am, "_cache", None, raising=False)
    assert am.get_mode() == "tieu_chuan"  # không nổ, chạy như mặc định
