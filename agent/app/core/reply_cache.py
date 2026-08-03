"""Cache câu trả lời cho câu hỏi LẶP Y HỆT — exact-match, KHÔNG embedding → MIỄN PHÍ.

Khác semantic cache (đã bỏ vì tốn tiền embedding): chỉ khớp câu GIỐNG HỆT sau khi
chuẩn hoá (hoa/thường, khoảng trắng, dấu câu cuối). Dành cho câu lặp nhiều: "hi",
"chào", "giờ mở cửa", "chính sách bảo hành"… → tiết kiệm quota/token, trả lời tức thì.

An toàn (không phục vụ câu cũ/sai — theo luật không bịa):
- CHỈ lượt ĐẦU hội thoại, không ảnh, không page_context.
- CHỈ khi KHÔNG dùng tool động (chỉ cho phép search_knowledge), KHÔNG kèm UI.
- Tự vô hiệu khi persona/knowledge đổi (khoá = hash) + TTL 14 ngày.
Lưu bền: data/reply_cache.local.json. Mọi lỗi → bỏ qua, chat vẫn chạy.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import tempfile
import time
import unicodedata
from pathlib import Path

from app.core.config import get_settings

_TTL_SECONDS = 14 * 86400
_MAX_ENTRIES = 1000
_MIN_Q, _MAX_Q = 1, 400
_SAFE_TOOLS = {"search_knowledge"}

_data: dict | None = None


def _path() -> Path:
    return Path(get_settings().chat_db_path).with_name("reply_cache.local.json")


def _load() -> dict:
    global _data
    if _data is None:
        p = _path()
        try:
            _data = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
        except Exception:
            _data = {}
        _data.setdefault("entries", {})  # {qn: {ans, ver, ts}}
        _data.setdefault("hits", 0)
        _data.setdefault("misses", 0)
        _data.setdefault("saved", 0)
    return _data


def _flush(data: dict) -> None:
    p = _path()
    p.parent.mkdir(parents=True, exist_ok=True)
    globals()["_data"] = data
    fd, tmp = tempfile.mkstemp(dir=str(p.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        os.replace(tmp, p)
    except Exception:
        if os.path.exists(tmp):
            os.unlink(tmp)


def _enabled() -> bool:
    try:
        from app.core.rate_limit import load_limits

        return bool(load_limits().get("cache_enabled", True))
    except Exception:
        return True


def kb_version() -> str:
    """Khoá phiên bản = hash(persona + knowledge). Đổi → cache cũ bị bỏ (tránh trả lời lỗi thời)."""
    try:
        from app.graph.nodes.context_node import PERSONA
        from app.services.knowledge import get_context_text

        raw = PERSONA + "\n" + (get_context_text() or "")
    except Exception:
        raw = "v0"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def _norm(q: str) -> str:
    """Chuẩn hoá khoá cache CHUẨN CHỈNH: NFC (gộp dấu tiếng Việt về 1 dạng) + hạ
    hoa/thường + gộp khoảng trắng + bỏ dấu câu cuối → câu gõ khác nguồn vẫn khớp."""
    q = unicodedata.normalize("NFC", q or "")
    return re.sub(r"\s+", " ", q.strip().lower()).strip(" ?!.…,;:")


def _page_section(page: str | None) -> str:
    """Rút gọn đường dẫn về SECTION = segment đầu ('/products/ong-nhua-d21' → '/products').

    Chỉ câu KHÔNG dùng tool động mới được cache → câu trả lời không thể phụ thuộc TỪNG
    sản phẩm cụ thể (muốn biết chi tiết phải gọi tool → không cache). Vì vậy gộp mọi
    '/products/*' về chung '/products' là AN TOÀN và giúp 'hi' trên mọi trang sản phẩm
    dùng chung 1 cache → tăng tỉ lệ hit mạnh, vẫn phân biệt theo khu vực (chủ đề)."""
    p = re.sub(r"\s+", "", (page or "").strip().lower()).strip("/")
    return "/" + p.split("/")[0] if p else "/"


def _key(question: str, page: str | None) -> str | None:
    """Khoá cache = (câu hỏi chuẩn hoá) + (SECTION trang). Câu chung ('hi') gõ lại trong
    cùng khu vực vẫn hit; câu phụ thuộc khu vực KHÔNG bị phục vụ nhầm sang khu vực khác.
    Trả None nếu độ dài câu hỏi bất thường."""
    qn = _norm(question)
    if not (_MIN_Q <= len(qn) <= _MAX_Q):
        return None
    return f"{qn}\x1f{_page_section(page)}"


def lookup(question: str, page: str | None = None) -> str | None:
    """Khớp câu hỏi giống hệt (đã chuẩn hoá) TRÊN CÙNG TRANG → câu trả lời cache."""
    if not _enabled():
        return None
    qn = _key(question, page)
    if qn is None:
        return None
    data = _load()
    e = data["entries"].get(qn)
    if not e:
        data["misses"] = data.get("misses", 0) + 1
        _flush(data)
        return None
    if e.get("ver") != kb_version() or time.time() - e.get("ts", 0) > _TTL_SECONDS:
        data["entries"].pop(qn, None)  # hết hạn / khác version → bỏ
        data["misses"] = data.get("misses", 0) + 1
        _flush(data)
        return None
    data["hits"] = data.get("hits", 0) + 1
    data["saved"] = data.get("saved", 0) + 1
    e["ts"] = int(time.time())  # LRU
    _flush(data)
    return e.get("ans")


def store(question: str, answer: str, tools_used: set[str] | None = None, had_ui: bool = False, page: str | None = None) -> None:
    """Lưu Q→A nếu AN TOÀN để cache (xem điều kiện ở docstring)."""
    if not _enabled() or had_ui:
        return
    ans = (answer or "").strip()
    qn = _key(question, page)
    if len(ans) < 2 or qn is None:
        return
    if tools_used and not set(tools_used) <= _SAFE_TOOLS:
        return  # đã dùng tool động (giá/tồn/gợi ý/thời gian…) → KHÔNG cache
    data = _load()
    data["entries"][qn] = {"ans": ans, "ver": kb_version(), "ts": int(time.time())}
    if len(data["entries"]) > _MAX_ENTRIES:  # LRU cắt bớt
        oldest = sorted(data["entries"].items(), key=lambda kv: kv[1].get("ts", 0))
        for k, _ in oldest[: len(data["entries"]) - _MAX_ENTRIES]:
            data["entries"].pop(k, None)
    _flush(data)


def stats() -> dict:
    data = _load()
    ver = kb_version()
    entries = sum(1 for e in data.get("entries", {}).values() if e.get("ver") == ver)
    hits, misses = data.get("hits", 0), data.get("misses", 0)
    return {
        "enabled": _enabled(),
        "entries": entries,
        "hits": hits,
        "misses": misses,
        "hit_rate": round(hits / (hits + misses), 3) if (hits + misses) else 0.0,
        "saved_calls": data.get("saved", 0),
    }


def clear() -> None:
    _flush({"entries": {}, "hits": 0, "misses": 0, "saved": 0})
