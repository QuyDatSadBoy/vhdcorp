"""Semantic response cache (kiểu GPTCache — Bang, 2023, arXiv:2311.13134): trả lời
câu hỏi LẶP LẠI / gần giống mà KHÔNG gọi LLM → tiết kiệm token & tiền.

An toàn TUYỆT ĐỐI (không bao giờ phục vụ câu trả lời cũ/sai — theo luật "không bịa"):
chỉ cache khi câu trả lời KHÔNG phụ thuộc ngữ cảnh hay dữ liệu sống:
  • lượt ĐẦU của hội thoại (không dính short-term memory / tóm tắt / facts),
  • KHÔNG gửi ảnh, KHÔNG có page_context (không hỏi "sản phẩm này/trang này"),
  • lượt đó KHÔNG dùng tool ĐỘNG — chỉ được phép `search_knowledge`,
  • KHÔNG kèm generative UI (carousel/form…), câu trả lời không rỗng.
Tự VÔ HIỆU khi persona/knowledge đổi (khoá theo hash) + TTL. Lưu bền JSON.

Tra cứu 2 tầng: exact-match (chuẩn hoá, 0 chi phí) → cosine similarity trên
embedding Gemini (chỉ khi có entry để so). Mọi lỗi cache → bỏ qua, chat vẫn chạy.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import re
import tempfile
import time
from pathlib import Path

from app.core.config import get_settings

_TTL_SECONDS = 14 * 86400  # entry sống 14 ngày
_MAX_ENTRIES = 500
_DEFAULT_SIM = 0.93  # ngưỡng cosine (admin chỉnh được); cao = an toàn hơn (ít khớp nhầm)
_MIN_Q, _MAX_Q = 3, 400  # câu quá ngắn/dài → không cache
_EMBED_MODEL = "models/text-embedding-004"

# Chỉ những tool "an toàn" (không phụ thuộc dữ liệu sống) mới cho phép cache.
_SAFE_TOOLS = {"search_knowledge"}

_embedder_obj = None


def _embedder():
    global _embedder_obj
    if _embedder_obj is None:
        from langchain_google_genai import GoogleGenerativeAIEmbeddings

        _embedder_obj = GoogleGenerativeAIEmbeddings(
            model=_EMBED_MODEL, google_api_key=get_settings().google_api_key
        )
    return _embedder_obj


async def _embed(text: str) -> list[float]:
    return await _embedder().aembed_query(text)


def _path() -> Path:
    return Path(get_settings().chat_db_path).with_name("semantic_cache.local.json")


_data: dict | None = None


def _load() -> dict:
    global _data
    if _data is None:
        p = _path()
        try:
            _data = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
        except Exception:
            _data = {}
        _data.setdefault("entries", [])
        _data.setdefault("hits", 0)
        _data.setdefault("misses", 0)
        _data.setdefault("saved_tokens", 0)
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


def kb_version() -> str:
    """Khoá phiên bản: hash(persona + knowledge). Đổi persona/knowledge → cache cũ bị bỏ."""
    try:
        from app.graph.nodes.context_node import PERSONA
        from app.services.knowledge import get_context_text

        raw = PERSONA + "\n" + (get_context_text() or "")
    except Exception:
        raw = "v0"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def _norm(q: str) -> str:
    return re.sub(r"\s+", " ", q.strip().lower()).strip(" ?!.…,;:")


def _cos(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def _cfg() -> tuple[bool, float]:
    """(enabled, threshold) — admin chỉnh qua chat-limits config."""
    try:
        from app.core.rate_limit import load_limits

        c = load_limits()
        enabled = bool(c.get("cache_enabled", True))
        thr = float(c.get("cache_similarity", _DEFAULT_SIM) or _DEFAULT_SIM)
        return enabled, min(0.999, max(0.5, thr))
    except Exception:
        return True, _DEFAULT_SIM


def _valid_entries(data: dict, ver: str) -> list[dict]:
    """Lọc entry còn hạn + đúng version (đồng thời dọn rác nếu có)."""
    now = time.time()
    keep = [e for e in data.get("entries", []) if e.get("ver") == ver and now - e.get("ts", 0) <= _TTL_SECONDS]
    if len(keep) != len(data.get("entries", [])):
        data["entries"] = keep
        _flush(data)
    return keep


def _est_tokens(answer: str, question: str) -> int:
    # Ước tính token tiết kiệm mỗi hit: prompt hệ thống lớn (~3k) + input + output.
    return 3000 + (len(question) + len(answer)) // 3


async def lookup(question: str) -> tuple[str | None, list[float] | None]:
    """Tra cache. Trả (answer_nếu_hit, embedding_đã_tính_để_store_tái_dùng)."""
    enabled, thr = _cfg()
    q = (question or "").strip()
    if not enabled or not (_MIN_Q <= len(q) <= _MAX_Q):
        return None, None
    ver = kb_version()
    data = _load()
    entries = _valid_entries(data, ver)
    qn = _norm(q)

    # Tầng 1: exact-match (0 chi phí embedding)
    for e in entries:
        if e.get("qn") == qn:
            _record_hit(data, e, q)
            return e.get("ans"), None

    if not entries:
        return None, None

    # Tầng 2: semantic (cosine)
    try:
        emb = await _embed(q)
    except Exception:
        return None, None
    best, best_sim = None, 0.0
    for e in entries:
        sim = _cos(emb, e.get("emb") or [])
        if sim > best_sim:
            best_sim, best = sim, e
    if best is not None and best_sim >= thr:
        _record_hit(data, best, q)
        return best.get("ans"), emb
    data["misses"] = data.get("misses", 0) + 1
    _flush(data)
    return None, emb  # miss → trả embedding để store tái dùng, khỏi tính lại


def _record_hit(data: dict, entry: dict, question: str) -> None:
    data["hits"] = data.get("hits", 0) + 1
    data["saved_tokens"] = data.get("saved_tokens", 0) + _est_tokens(entry.get("ans", ""), question)
    entry["ts"] = int(time.time())  # LRU: giữ entry hay dùng
    _flush(data)


async def store(
    question: str,
    answer: str,
    embedding: list[float] | None = None,
    tools_used: set[str] | None = None,
    had_ui: bool = False,
) -> None:
    """Lưu Q→A NẾU an toàn để cache (xem điều kiện ở docstring module)."""
    enabled, _ = _cfg()
    q = (question or "").strip()
    ans = (answer or "").strip()
    if not enabled or had_ui or len(ans) < 5 or not (_MIN_Q <= len(q) <= _MAX_Q):
        return
    if tools_used and not set(tools_used) <= _SAFE_TOOLS:
        return  # đã dùng tool động (giá/tồn/gợi ý/thời gian…) → KHÔNG cache
    ver = kb_version()
    if embedding is None:
        try:
            embedding = await _embed(q)
        except Exception:
            return
    data = _load()
    qn = _norm(q)
    data["entries"] = [e for e in data.get("entries", []) if not (e.get("qn") == qn and e.get("ver") == ver)]
    data["entries"].append(
        {"q": q[:_MAX_Q], "qn": qn, "emb": embedding, "ans": ans, "ts": int(time.time()), "ver": ver}
    )
    if len(data["entries"]) > _MAX_ENTRIES:
        data["entries"] = sorted(data["entries"], key=lambda e: e.get("ts", 0))[-_MAX_ENTRIES:]
    _flush(data)


def stats() -> dict:
    data = _load()
    ver = kb_version()
    entries = [e for e in data.get("entries", []) if e.get("ver") == ver]
    hits, misses = data.get("hits", 0), data.get("misses", 0)
    total = hits + misses
    return {
        "enabled": _cfg()[0],
        "similarity": _cfg()[1],
        "entries": len(entries),
        "hits": hits,
        "misses": misses,
        "hit_rate": round(hits / total, 3) if total else 0.0,
        "saved_tokens": data.get("saved_tokens", 0),
    }


def clear() -> None:
    _flush({"entries": [], "hits": 0, "misses": 0, "saved_tokens": 0})
