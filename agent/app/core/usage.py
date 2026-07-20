"""Thống kê sử dụng AI + ước tính chi phí — lưu bền theo NGÀY (giờ VN).

Ghi nhận mỗi lượt chat: có gọi LLM hay bị chặn, và TOKEN THẬT (input/output từ
usage_metadata của Gemini). Chi phí = token × đơn giá admin cấu hình (VND/1tr token).

Lưu file JSON data/usage_stats.local.json (gitignore), giữ 60 ngày gần nhất.
Ghi in-memory rồi flush ra đĩa (atomic) — nhẹ, còn nguyên sau restart.
"""

from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from app.core.config import get_settings

_VN = ZoneInfo("Asia/Ho_Chi_Minh")
_KEEP_DAYS = 60
_data: dict[str, dict] | None = None


def _path() -> Path:
    return Path(get_settings().chat_db_path).with_name("usage_stats.local.json")


def _today() -> str:
    return datetime.now(_VN).strftime("%Y-%m-%d")


def _load() -> dict[str, dict]:
    global _data
    if _data is None:
        p = _path()
        try:
            _data = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
        except Exception:
            _data = {}
    return _data


def _flush() -> None:
    p = _path()
    p.parent.mkdir(parents=True, exist_ok=True)
    # cắt bớt ngày cũ
    cutoff = (datetime.now(_VN) - timedelta(days=_KEEP_DAYS)).strftime("%Y-%m-%d")
    data = {d: v for d, v in _load().items() if d >= cutoff}
    globals()["_data"] = data
    fd, tmp = tempfile.mkstemp(dir=str(p.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        os.replace(tmp, p)
    except Exception:
        if os.path.exists(tmp):
            os.unlink(tmp)


def _bucket(day: str) -> dict:
    data = _load()
    b = data.get(day)
    if b is None:
        b = {"requests": 0, "blocked": 0, "input_tokens": 0, "output_tokens": 0}
        data[day] = b
    return b


def record_request(input_tokens: int = 0, output_tokens: int = 0) -> None:
    """Một lượt CÓ gọi LLM (kèm token thật nếu bắt được)."""
    b = _bucket(_today())
    b["requests"] += 1
    b["input_tokens"] += max(0, int(input_tokens))
    b["output_tokens"] += max(0, int(output_tokens))
    _flush()


def record_blocked() -> None:
    """Một lượt BỊ CHẶN (rate-limit/blocklist) — không tốn tiền, nhưng vẫn thống kê."""
    b = _bucket(_today())
    b["blocked"] += 1
    _flush()


def stats(days: int = 30) -> dict:
    """Tổng hợp N ngày gần nhất + ước tính chi phí theo đơn giá cấu hình."""
    from app.core.rate_limit import load_limits

    cfg = load_limits()
    price_in = float(cfg.get("price_per_1m_input_vnd", 0) or 0)
    price_out = float(cfg.get("price_per_1m_output_vnd", 0) or 0)

    data = _load()
    today = _today()
    series: list[dict] = []
    for i in range(days - 1, -1, -1):
        d = (datetime.now(_VN) - timedelta(days=i)).strftime("%Y-%m-%d")
        b = data.get(d, {"requests": 0, "blocked": 0, "input_tokens": 0, "output_tokens": 0})
        cost = b["input_tokens"] / 1_000_000 * price_in + b["output_tokens"] / 1_000_000 * price_out
        series.append({**{"date": d}, **b, "cost_vnd": round(cost)})

    def totals(items: list[dict]) -> dict:
        t = {"requests": 0, "blocked": 0, "input_tokens": 0, "output_tokens": 0, "cost_vnd": 0}
        for it in items:
            for k in t:
                t[k] += it[k]
        return t

    today_row = next((s for s in series if s["date"] == today), series[-1])
    return {
        "series": series,
        "today": today_row,
        "total": totals(series),
        "price_per_1m_input_vnd": price_in,
        "price_per_1m_output_vnd": price_out,
        "days": days,
    }
