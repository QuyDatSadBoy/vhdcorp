"""Thống kê sử dụng AI theo MODEL + ước tính chi phí (USD gốc → VND).

Ghi nhận mỗi lượt: model nào, token thật (input/output từ usage_metadata Gemini),
và lượt bị chặn. Chi phí = token × đơn giá USD/1tr token của ĐÚNG model đó,
quy đổi VND theo tỷ giá cấu hình. Lưu bền theo ngày (giờ VN), JSON giữ 60 ngày.

Cấu trúc: data[YYYY-MM-DD] = {"blocked": n, "models": {model: {requests, input_tokens, output_tokens}}}
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
    if b is None or "models" not in b:
        # tạo mới hoặc nâng cấp bản cũ (flat) → cấu trúc per-model
        old = b or {}
        b = {"blocked": int(old.get("blocked", 0)), "models": {}}
        if old.get("requests"):
            b["models"][get_settings().agent_model] = {
                "requests": int(old.get("requests", 0)),
                "input_tokens": int(old.get("input_tokens", 0)),
                "output_tokens": int(old.get("output_tokens", 0)),
            }
        data[day] = b
    return b


def record_request(model: str, input_tokens: int = 0, output_tokens: int = 0) -> None:
    """Một lượt CÓ gọi LLM: ghi theo model + token thật + theo giờ."""
    model = (model or get_settings().agent_model).strip()
    itok, otok = max(0, int(input_tokens)), max(0, int(output_tokens))
    b = _bucket(_today())
    m = b["models"].setdefault(model, {"requests": 0, "input_tokens": 0, "output_tokens": 0})
    m["requests"] += 1
    m["input_tokens"] += itok
    m["output_tokens"] += otok
    # theo giờ (0..23 giờ VN) — cho biểu đồ trong ngày
    hours = b.setdefault("hours", {})
    hkey = datetime.now(_VN).strftime("%H")
    h = hours.setdefault(hkey, {"requests": 0, "input_tokens": 0, "output_tokens": 0})
    h["requests"] += 1
    h["input_tokens"] += itok
    h["output_tokens"] += otok
    _flush()


def record_blocked() -> None:
    _bucket(_today())["blocked"] += 1
    _flush()


# ── Bảng giá mặc định (USD / 1 triệu token) — admin chỉnh theo bảng giá Google ──
DEFAULT_MODEL_PRICES = {
    "gemini-3-flash-preview": {"in": 0.10, "out": 0.40},
    "gemini-3-flash": {"in": 0.10, "out": 0.40},
    "gemini-flash-lite-latest": {"in": 0.04, "out": 0.15},
    "gemini-2.0-flash": {"in": 0.10, "out": 0.40},
}
_FALLBACK_PRICE = {"in": 0.10, "out": 0.40}


def _price_for(model: str, cfg_prices: dict) -> dict:
    return cfg_prices.get(model) or DEFAULT_MODEL_PRICES.get(model) or _FALLBACK_PRICE


def _bucket_cost_usd(b: dict, cfg_prices: dict) -> float:
    """Chi phí USD của 1 bucket ngày (cộng theo model)."""
    models = b.get("models")
    if not models and b.get("requests"):  # bản cũ flat
        models = {get_settings().agent_model: b}
    total = 0.0
    for model, m in (models or {}).items():
        p = _price_for(model, cfg_prices)
        total += int(m.get("input_tokens", 0)) / 1_000_000 * float(p["in"])
        total += int(m.get("output_tokens", 0)) / 1_000_000 * float(p["out"])
    return total


def spend_today_usd() -> float:
    from app.core.rate_limit import load_limits

    return _bucket_cost_usd(_load().get(_today(), {}), load_limits().get("model_prices") or {})


def spend_month_usd() -> float:
    """Tổng chi phí USD từ đầu tháng (giờ VN)."""
    from app.core.rate_limit import load_limits

    prices = load_limits().get("model_prices") or {}
    prefix = datetime.now(_VN).strftime("%Y-%m")
    return sum(_bucket_cost_usd(b, prices) for d, b in _load().items() if d.startswith(prefix))


def stats(days: int = 30) -> dict:
    """Tổng hợp N ngày: chuỗi theo ngày, tổng theo model, chi phí USD + VND."""
    from app.core.rate_limit import load_limits

    cfg = load_limits()
    cfg_prices = cfg.get("model_prices") or {}
    rate = float(cfg.get("usd_to_vnd", 26000) or 26000)
    data = _load()
    today = _today()

    def cost_usd(model: str, itok: int, otok: int) -> float:
        p = _price_for(model, cfg_prices)
        return itok / 1_000_000 * float(p["in"]) + otok / 1_000_000 * float(p["out"])

    series: list[dict] = []
    model_totals: dict[str, dict] = {}
    for i in range(days - 1, -1, -1):
        d = (datetime.now(_VN) - timedelta(days=i)).strftime("%Y-%m-%d")
        b = data.get(d) or {}
        models = (b.get("models") if "models" in b else None) or (
            {get_settings().agent_model: {"requests": b.get("requests", 0), "input_tokens": b.get("input_tokens", 0), "output_tokens": b.get("output_tokens", 0)}}
            if b.get("requests")
            else {}
        )
        day_req = day_in = day_out = 0
        day_cost = 0.0
        for model, m in models.items():
            r, it, ot = int(m.get("requests", 0)), int(m.get("input_tokens", 0)), int(m.get("output_tokens", 0))
            day_req += r
            day_in += it
            day_out += ot
            c = cost_usd(model, it, ot)
            day_cost += c
            mt = model_totals.setdefault(model, {"model": model, "requests": 0, "input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0})
            mt["requests"] += r
            mt["input_tokens"] += it
            mt["output_tokens"] += ot
            mt["cost_usd"] += c
        series.append({
            "date": d, "requests": day_req, "blocked": int(b.get("blocked", 0)),
            "input_tokens": day_in, "output_tokens": day_out,
            "cost_usd": round(day_cost, 4), "cost_vnd": round(day_cost * rate),
        })

    def totals(items: list[dict]) -> dict:
        t = {"requests": 0, "blocked": 0, "input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0, "cost_vnd": 0}
        for it in items:
            for k in t:
                t[k] += it[k]
        t["cost_usd"] = round(t["cost_usd"], 4)
        return t

    by_model = []
    for mt in model_totals.values():
        p = _price_for(mt["model"], cfg_prices)
        by_model.append({
            **mt, "cost_usd": round(mt["cost_usd"], 4), "cost_vnd": round(mt["cost_usd"] * rate),
            "price_in_usd": float(p["in"]), "price_out_usd": float(p["out"]),
        })
    by_model.sort(key=lambda x: -x["cost_usd"])

    # Theo giờ (hôm nay, 0..23) — token + ước tính chi phí theo rate blended của ngày
    tb = data.get(today) or {}
    day_tok = max(1, sum(int(m.get("input_tokens", 0)) + int(m.get("output_tokens", 0)) for m in (tb.get("models") or {}).values()))
    day_cost_today = _bucket_cost_usd(tb, cfg_prices)
    hours = tb.get("hours") or {}
    today_hours = []
    for hh in range(24):
        h = hours.get(f"{hh:02d}") or {}
        htok = int(h.get("input_tokens", 0)) + int(h.get("output_tokens", 0))
        hcost = day_cost_today * (htok / day_tok)
        today_hours.append({
            "hour": hh, "requests": int(h.get("requests", 0)),
            "tokens": htok, "cost_usd": round(hcost, 5), "cost_vnd": round(hcost * rate),
        })

    spend_today = _bucket_cost_usd(tb, cfg_prices)
    month_prefix = datetime.now(_VN).strftime("%Y-%m")
    spend_month = sum(_bucket_cost_usd(b, cfg_prices) for d, b in data.items() if d.startswith(month_prefix))

    return {
        "series": series,
        "today": next((s for s in series if s["date"] == today), series[-1]),
        "today_hours": today_hours,
        "total": totals(series),
        "by_model": by_model,
        "usd_to_vnd": rate,
        "days": days,
        "spend_today_usd": round(spend_today, 4),
        "spend_month_usd": round(spend_month, 4),
        "daily_budget_usd": float(cfg.get("daily_budget_usd", 0) or 0),
        "monthly_budget_usd": float(cfg.get("monthly_budget_usd", 0) or 0),
        "currency": cfg.get("currency", "vnd"),
    }
