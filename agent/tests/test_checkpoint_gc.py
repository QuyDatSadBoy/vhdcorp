"""Dọn checkpoint: phải xoá đúng thứ cần xoá và TUYỆT ĐỐI không đụng hội thoại đang sống."""

import sqlite3

from app.services.checkpoint_gc import collect_garbage


def _make_chat_db(path, rows):
    """rows: (id, số ngày trước) — 0 nghĩa là vừa dùng hôm nay."""
    with sqlite3.connect(path) as c:
        c.execute("CREATE TABLE conversations (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, created_at TEXT, updated_at TEXT)")
        for cid, days in rows:
            c.execute(
                "INSERT INTO conversations VALUES (?, 'u', 't', datetime('now'), datetime('now', ?))",
                (cid, f"-{days} days"),
            )


def _make_cp_db(path, thread_ids):
    with sqlite3.connect(path) as c:
        c.execute("CREATE TABLE checkpoints (thread_id TEXT, checkpoint_ns TEXT, checkpoint_id TEXT, parent_checkpoint_id TEXT, type TEXT, checkpoint BLOB, metadata BLOB)")
        c.execute("CREATE TABLE writes (thread_id TEXT, checkpoint_ns TEXT, checkpoint_id TEXT, task_id TEXT, idx INT, channel TEXT, type TEXT, value BLOB)")
        for t in thread_ids:
            c.execute("INSERT INTO checkpoints VALUES (?, '', 'c1', NULL, 't', X'00', X'00')", (t,))
            c.execute("INSERT INTO writes VALUES (?, '', 'c1', 'task', 0, 'ch', 't', X'00')", (t,))


def _threads(path):
    with sqlite3.connect(path) as c:
        return {r[0] for r in c.execute("SELECT DISTINCT thread_id FROM checkpoints")}


def test_giu_hoi_thoai_dang_song_xoa_cai_cu_va_mo_coi(tmp_path):
    chat, cp = tmp_path / "chat.db", tmp_path / "cp.sqlite"
    _make_chat_db(chat, [("moi", 0), ("hom-qua", 1), ("qua-cu", 90)])
    # "mo-coi" không có trong danh sách hội thoại (khách đã xoá / thread A2A tạm)
    _make_cp_db(cp, ["moi", "hom-qua", "qua-cu", "mo-coi"])

    removed = collect_garbage(str(cp), str(chat), keep_days=30)

    assert removed == 2                       # qua-cu + mo-coi
    assert _threads(cp) == {"moi", "hom-qua"}  # hội thoại đang dùng còn nguyên


def test_khong_co_gi_de_don_thi_khong_dung_vao(tmp_path):
    chat, cp = tmp_path / "chat.db", tmp_path / "cp.sqlite"
    _make_chat_db(chat, [("a", 0), ("b", 2)])
    _make_cp_db(cp, ["a", "b"])
    assert collect_garbage(str(cp), str(chat), keep_days=30) == 0
    assert _threads(cp) == {"a", "b"}


def test_xoa_ca_bang_writes(tmp_path):
    chat, cp = tmp_path / "chat.db", tmp_path / "cp.sqlite"
    _make_chat_db(chat, [("giu", 0)])
    _make_cp_db(cp, ["giu", "bo"])
    collect_garbage(str(cp), str(chat), keep_days=30)
    with sqlite3.connect(cp) as c:
        assert {r[0] for r in c.execute("SELECT DISTINCT thread_id FROM writes")} == {"giu"}


def test_thieu_file_thi_bo_qua_khong_no(tmp_path):
    assert collect_garbage(str(tmp_path / "khong-co.sqlite"), str(tmp_path / "cung-khong.db")) == 0


def test_db_hong_thi_bo_qua_chu_khong_lam_sap_service(tmp_path):
    chat, cp = tmp_path / "chat.db", tmp_path / "cp.sqlite"
    _make_chat_db(chat, [("a", 0)])
    cp.write_bytes(b"day khong phai sqlite")
    assert collect_garbage(str(cp), str(chat)) == 0
