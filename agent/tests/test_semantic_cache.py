"""Semantic cache: exact/semantic hit, gating an toàn, version invalidation, TTL.

Gemini key thật không có ở CI nên MOCK _embed bằng vector token đơn giản để cosine
tất định (chia sẻ token → 1.0, khác token → 0.0).
"""

import time
import unicodedata

import pytest

from app.core import semantic_cache as sc

_VOCAB = ["bao", "hanh", "gio", "mo", "cua", "dia", "chi", "gioang", "gia", "doi", "tra"]


def _ascii(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")


def _fake_vec(text: str) -> list[float]:
    t = _ascii(text)  # bỏ dấu: "bảo hành" → "bao hanh" để token khớp VOCAB ascii
    v = [1.0 if w in t else 0.0 for w in _VOCAB]
    return v if any(v) else [1.0] + [0.0] * (len(_VOCAB) - 1)


@pytest.fixture(autouse=True)
def _isolate(tmp_path, monkeypatch):
    # cache file riêng cho mỗi test + reset state + mock embedding + version cố định
    monkeypatch.setattr(sc, "_path", lambda: tmp_path / "semantic_cache.local.json")
    monkeypatch.setattr(sc, "_data", None, raising=False)

    async def fake_embed(text: str):
        return _fake_vec(text)

    monkeypatch.setattr(sc, "_embed", fake_embed)
    monkeypatch.setattr(sc, "kb_version", lambda: "testver1")
    # cache bật, ngưỡng 0.9
    monkeypatch.setattr(sc, "_cfg", lambda: (True, 0.9))
    yield


def test_norm():
    assert sc._norm("  Giờ  MỞ cửa??? ") == "giờ mở cửa"
    assert sc._norm("A. B.") == "a. b"


def test_cosine():
    assert round(sc._cos([1, 0, 0], [1, 0, 0]), 3) == 1.0
    assert sc._cos([1, 0], [0, 1]) == 0.0
    assert sc._cos([], [1]) == 0.0


async def test_exact_hit_no_embedding_needed(monkeypatch):
    # nếu exact-match hoạt động thì KHÔNG được gọi _embed
    called = {"n": 0}

    async def boom(text):
        called["n"] += 1
        return _fake_vec(text)

    await sc.store("Chính sách bảo hành thế nào", "Bảo hành 12 tháng.", embedding=_fake_vec("bao hanh"))
    monkeypatch.setattr(sc, "_embed", boom)
    ans, emb = await sc.lookup("chính sách bảo hành thế nào")  # cùng câu, khác hoa/thường
    assert ans == "Bảo hành 12 tháng."
    assert called["n"] == 0  # exact-match, không cần embedding


async def test_semantic_hit_and_miss():
    await sc.store("Chính sách bảo hành", "Bảo hành 12 tháng.", embedding=_fake_vec("bao hanh"))
    # câu khác chữ nhưng cùng token 'bao','hanh' → cosine 1 ≥ 0.9 → HIT
    ans, _ = await sc.lookup("cho mình hỏi bảo hành với")
    assert ans == "Bảo hành 12 tháng."
    # câu khác hẳn chủ đề → MISS
    ans2, _ = await sc.lookup("giờ mở cửa mấy giờ")
    assert ans2 is None


async def test_gate_dynamic_tool_not_cached():
    # dùng tool động (search_products) → KHÔNG được lưu
    await sc.store("giá gioăng bao nhiêu", "Giá 25.000đ", embedding=_fake_vec("gioang gia"), tools_used={"search_products"})
    ans, _ = await sc.lookup("giá gioăng bao nhiêu")
    assert ans is None


async def test_gate_safe_tool_ok():
    await sc.store("đổi trả thế nào", "Đổi trả trong 7 ngày.", embedding=_fake_vec("doi tra"), tools_used={"search_knowledge"})
    ans, _ = await sc.lookup("đổi trả thế nào")
    assert ans == "Đổi trả trong 7 ngày."


async def test_gate_had_ui_not_cached():
    await sc.store("xem sản phẩm", "Đây là các mẫu.", embedding=_fake_vec("gioang"), had_ui=True)
    ans, _ = await sc.lookup("xem sản phẩm")
    assert ans is None


async def test_gate_too_short_or_long():
    await sc.store("ok", "answer", embedding=_fake_vec("bao"))  # quá ngắn
    assert (await sc.lookup("ok"))[0] is None
    long_q = "a" * 500
    await sc.store(long_q, "answer", embedding=_fake_vec("bao"))
    assert (await sc.lookup(long_q))[0] is None


async def test_version_invalidation(monkeypatch):
    await sc.store("chính sách bảo hành", "Bảo hành 12 tháng.", embedding=_fake_vec("bao hanh"))
    assert (await sc.lookup("chính sách bảo hành"))[0] == "Bảo hành 12 tháng."
    # đổi version (persona/knowledge đổi) → entry cũ bị bỏ
    monkeypatch.setattr(sc, "kb_version", lambda: "testver2")
    assert (await sc.lookup("chính sách bảo hành"))[0] is None


async def test_ttl_expiry():
    await sc.store("chính sách bảo hành", "Bảo hành 12 tháng.", embedding=_fake_vec("bao hanh"))
    data = sc._load()
    data["entries"][0]["ts"] = int(time.time()) - sc._TTL_SECONDS - 10  # quá hạn
    sc._flush(data)
    assert (await sc.lookup("chính sách bảo hành"))[0] is None


async def test_disabled_config(monkeypatch):
    monkeypatch.setattr(sc, "_cfg", lambda: (False, 0.9))
    await sc.store("chính sách bảo hành", "Bảo hành 12 tháng.", embedding=_fake_vec("bao hanh"))
    assert (await sc.lookup("chính sách bảo hành"))[0] is None


async def test_stats_counts():
    await sc.store("đổi trả thế nào", "Đổi trả 7 ngày.", embedding=_fake_vec("doi tra"))
    await sc.lookup("đổi trả thế nào")  # hit
    await sc.lookup("giờ mở cửa")  # miss (không có entry khớp)
    st = sc.stats()
    assert st["hits"] >= 1
    assert st["entries"] >= 1
