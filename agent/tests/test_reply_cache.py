"""Reply cache (exact-match, miễn phí): hit/normalize/gating/version/TTL/disabled."""

import time

import pytest

from app.core import reply_cache as rc


@pytest.fixture(autouse=True)
def _isolate(tmp_path, monkeypatch):
    monkeypatch.setattr(rc, "_path", lambda: tmp_path / "reply_cache.local.json")
    monkeypatch.setattr(rc, "_data", None, raising=False)
    monkeypatch.setattr(rc, "kb_version", lambda: "ver1")
    monkeypatch.setattr(rc, "_enabled", lambda: True)
    yield


def test_norm():
    assert rc._norm("  Hi!! ") == "hi"
    assert rc._norm("Giờ  MỞ cửa??") == "giờ mở cửa"


def test_exact_hit_case_punct_insensitive():
    rc.store("Hi", "Chào bạn!")
    assert rc.lookup("hi") == "Chào bạn!"
    assert rc.lookup("  HI!!  ") == "Chào bạn!"  # chuẩn hoá hoa/thường + dấu câu
    assert rc.lookup("hello") is None  # khác câu → miss


def test_gate_dynamic_tool_not_cached():
    rc.store("giá gioăng", "25.000đ", tools_used={"search_products"})
    assert rc.lookup("giá gioăng") is None


def test_gate_safe_tool_ok():
    rc.store("bảo hành thế nào", "12 tháng", tools_used={"search_knowledge"})
    assert rc.lookup("bảo hành thế nào") == "12 tháng"


def test_gate_had_ui_not_cached():
    rc.store("xem sản phẩm", "đây", had_ui=True)
    assert rc.lookup("xem sản phẩm") is None


def test_version_invalidation(monkeypatch):
    rc.store("hi", "chào")
    assert rc.lookup("hi") == "chào"
    monkeypatch.setattr(rc, "kb_version", lambda: "ver2")  # knowledge/persona đổi
    assert rc.lookup("hi") is None


def test_ttl_expiry():
    rc.store("hi", "chào")
    data = rc._load()
    data["entries"][rc._key("hi", None)]["ts"] = int(time.time()) - rc._TTL_SECONDS - 10
    rc._flush(data)
    assert rc.lookup("hi") is None


def test_page_scoped_key():
    """Cùng câu, KHÁC trang → cache tách riêng (không phục vụ nhầm câu phụ thuộc trang)."""
    rc.store("hi", "Chào từ trang chủ", page="/")
    rc.store("hi", "Chào từ trang sản phẩm", page="/products")
    assert rc.lookup("hi", page="/") == "Chào từ trang chủ"
    assert rc.lookup("hi", page="/products") == "Chào từ trang sản phẩm"
    # trang chưa từng lưu → miss
    assert rc.lookup("hi", page="/posts") is None


def test_page_normalized_trailing_slash():
    """'/products/' và '/products' coi là CÙNG trang → vẫn hit."""
    rc.store("hi", "chào", page="/products/")
    assert rc.lookup("hi", page="/products") == "chào"


def test_page_section_collapse():
    """Mọi trang chi tiết trong CÙNG khu vực dùng chung cache (tăng hit) — vì câu
    không-tool không thể phụ thuộc từng sản phẩm cụ thể."""
    rc.store("hi", "chào", page="/products/ong-nhua-pvc-d21")
    assert rc.lookup("hi", page="/products/gioang-cao-su-o12") == "chào"  # khác slug, cùng section
    assert rc.lookup("hi", page="/products") == "chào"
    assert rc.lookup("hi", page="/") is None  # khác section → tách riêng


def test_page_section_helper():
    assert rc._page_section("/products/ong-nhua-d21") == "/products"
    assert rc._page_section("/") == "/"
    assert rc._page_section("") == "/"
    assert rc._page_section(None) == "/"
    assert rc._page_section("/posts/abc/xyz") == "/posts"


def test_disabled(monkeypatch):
    monkeypatch.setattr(rc, "_enabled", lambda: False)
    rc.store("hi", "chào")
    assert rc.lookup("hi") is None


def test_stats_and_clear():
    rc.store("hi", "chào")
    rc.lookup("hi")  # hit
    rc.lookup("khác")  # miss
    st = rc.stats()
    assert st["hits"] >= 1 and st["entries"] >= 1
    rc.clear()
    assert rc.lookup("hi") is None
    assert rc.stats()["entries"] == 0
