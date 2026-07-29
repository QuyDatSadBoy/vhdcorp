"""Chống spam chat để KHÔNG mất tiền API (mỗi tin = 1 lần gọi Gemini tốn phí).

Nhiều tầng, chặn TRƯỚC khi gọi LLM:
- Kill switch: admin tắt chat khi bị tấn công.
- Theo IP: burst/phút + tổng/ngày (X-Chat-User do client tự đặt → không tin được,
  IP thật lấy từ Cloudflare CF-Connecting-IP là hàng rào chính).
- Trần TOÀN CỤC/ngày: mức trần cứng cho tổng lượt gọi LLM cả hệ thống — dù bị
  tấn công phân tán từ nhiều IP, chi phí/ngày vẫn không vượt ngưỡng.

Cấu hình runtime: data/chat_limits.local.json (admin sửa qua API, hiệu lực ngay,
không cần deploy). Bộ đếm in-memory (sliding window) — đủ nhẹ, reset khi restart.
"""

from __future__ import annotations

import json
import time
from collections import defaultdict, deque
from pathlib import Path

from app.core.config import get_settings

# Mặc định an toàn (admin chỉnh được):
DEFAULTS = {
    "enabled": True,          # False = tắt chat toàn bộ (kill switch)
    "per_ip_per_min": 6,      # burst tối đa 1 IP / 60s
    "per_ip_per_hour": 60,    # 1 IP / giờ
    "per_ip_per_day": 200,    # 1 IP / ngày
    "global_per_day": 5000,   # TRẦN CỨNG tổng lượt gọi LLM cả hệ thống / ngày
    "blocked_ips": [],        # chặn cứng danh sách IP (chặn nâng cao)
    # Chi phí: giá GỐC USD / 1 triệu token theo TỪNG model + tỷ giá quy đổi VND.
    "usd_to_vnd": 26000,
    "model_prices": {},       # {model: {"in": usd, "out": usd}} — rỗng thì dùng mặc định theo model
    # CẦU DAO TIỀN: vượt ngân sách USD trong NGÀY / THÁNG → tự ngắt chat (0 = tắt).
    "daily_budget_usd": 0,
    "monthly_budget_usd": 0,
    "currency": "vnd",        # đơn vị hiển thị/nhập ở admin: "vnd" | "usd"
}


def _config_path() -> Path:
    return Path(get_settings().chat_db_path).with_name("chat_limits.local.json")


_cfg_cache: dict | None = None
_cfg_mtime: float = 0.0


def load_limits() -> dict:
    """Đọc cấu hình (cache theo mtime — sửa file là nhận ngay, không đọc đĩa mỗi request)."""
    global _cfg_cache, _cfg_mtime
    p = _config_path()
    try:
        mtime = p.stat().st_mtime if p.exists() else 0.0
        if _cfg_cache is None or mtime != _cfg_mtime:
            data = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
            _cfg_cache = {**DEFAULTS, **{k: data[k] for k in DEFAULTS if k in data}}
            _cfg_mtime = mtime
    except Exception:
        _cfg_cache = dict(DEFAULTS)
    return _cfg_cache


def save_limits(new: dict) -> dict:
    """Ghi cấu hình runtime (admin) — chỉ nhận các khoá hợp lệ, ép kiểu an toàn."""
    cur = load_limits()
    merged = dict(cur)
    if "enabled" in new:
        merged["enabled"] = bool(new["enabled"])
    for k in ("per_ip_per_min", "per_ip_per_hour", "per_ip_per_day", "global_per_day"):
        if k in new and new[k] is not None:
            merged[k] = max(0, int(new[k]))
    for k in ("usd_to_vnd", "daily_budget_usd", "monthly_budget_usd"):
        if k in new and new[k] is not None:
            merged[k] = max(0.0, float(new[k]))
    if new.get("currency") in ("vnd", "usd"):
        merged["currency"] = new["currency"]
    if "model_prices" in new and isinstance(new["model_prices"], dict):
        clean: dict[str, dict] = {}
        for model, p in new["model_prices"].items():
            if isinstance(p, dict):
                clean[str(model).strip()] = {
                    "in": max(0.0, float(p.get("in", 0) or 0)),
                    "out": max(0.0, float(p.get("out", 0) or 0)),
                }
        merged["model_prices"] = clean
    if "blocked_ips" in new and isinstance(new["blocked_ips"], list):
        # chuẩn hoá: bỏ trùng, cắt khoảng trắng, tối đa 500 IP
        merged["blocked_ips"] = list(dict.fromkeys(str(x).strip() for x in new["blocked_ips"] if str(x).strip()))[:500]
    p = _config_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    global _cfg_cache, _cfg_mtime
    _cfg_cache = merged
    _cfg_mtime = p.stat().st_mtime
    return merged


# Bộ đếm sliding-window: mỗi key giữ deque timestamp
_ip_hits: dict[str, deque[float]] = defaultdict(deque)
_ip_blocked: dict[str, deque[float]] = defaultdict(deque)  # lần bị chặn/IP (phát hiện IP nghi vấn)
_global_hits: deque[float] = deque()

_DAY = 86400
_HOUR = 3600
_MIN = 60


def _trim(dq: deque[float], now: float, window: float) -> None:
    while dq and now - dq[0] > window:
        dq.popleft()


def check(ip: str) -> tuple[bool, str]:
    """Kiểm tra 1 lượt chat từ IP. Trả (allowed, lý-do-nếu-chặn). KHÔNG tính lượt ở đây."""
    cfg = load_limits()
    if not cfg["enabled"]:
        return False, "Trợ lý AI đang tạm bảo trì, bạn vui lòng liên hệ hotline 0879.744.888 nhé."
    if ip in cfg.get("blocked_ips", []):
        return False, "Yêu cầu của bạn không thể xử lý. Vui lòng liên hệ hotline 0879.744.888 nếu cần hỗ trợ."

    # CẦU DAO TIỀN: vượt ngân sách ngày/tháng → tự ngắt (bảo vệ chi phí tối đa)
    daily_bud = float(cfg.get("daily_budget_usd", 0) or 0)
    monthly_bud = float(cfg.get("monthly_budget_usd", 0) or 0)
    if daily_bud > 0 or monthly_bud > 0:
        from app.core import usage  # tránh import vòng

        if daily_bud > 0 and usage.spend_today_usd() >= daily_bud:
            return False, "Trợ lý AI tạm nghỉ hôm nay do đã đạt ngân sách. Bạn vui lòng liên hệ hotline 0879.744.888 nhé."
        if monthly_bud > 0 and usage.spend_month_usd() >= monthly_bud:
            return False, "Trợ lý AI tạm nghỉ do đã đạt ngân sách tháng. Bạn vui lòng liên hệ hotline 0879.744.888 nhé."

    now = time.time()

    _trim(_global_hits, now, _DAY)
    if cfg["global_per_day"] and len(_global_hits) >= cfg["global_per_day"]:
        return False, "Hệ thống đang quá tải hôm nay. Bạn vui lòng liên hệ hotline 0879.744.888 để được hỗ trợ ngay nhé."

    dq = _ip_hits[ip]
    _trim(dq, now, _DAY)
    per_min = sum(1 for t in dq if now - t <= _MIN)
    per_hour = sum(1 for t in dq if now - t <= _HOUR)
    if cfg["per_ip_per_min"] and per_min >= cfg["per_ip_per_min"]:
        return False, "Bạn nhắn hơi nhanh 😅 Chờ một chút rồi nhắn tiếp giúp mình nhé."
    if cfg["per_ip_per_hour"] and per_hour >= cfg["per_ip_per_hour"]:
        return False, "Bạn đã hỏi khá nhiều trong giờ qua. Nghỉ chút rồi quay lại nhé, hoặc gọi hotline 0879.744.888."
    if cfg["per_ip_per_day"] and len(dq) >= cfg["per_ip_per_day"]:
        return False, "Bạn đã dùng hết lượt chat hôm nay. Vui lòng liên hệ hotline 0879.744.888 để được hỗ trợ trực tiếp nhé."
    return True, ""


def record(ip: str) -> None:
    """Tính 1 lượt (gọi khi CHẮC CHẮN sẽ chạy LLM)."""
    now = time.time()
    _ip_hits[ip].append(now)
    _global_hits.append(now)


def note_blocked(ip: str) -> None:
    """Ghi 1 lần IP bị chặn (để phát hiện IP nghi vấn cho admin)."""
    _ip_blocked[ip].append(time.time())


def top_ips(limit: int = 15) -> list[dict]:
    """Top IP theo hoạt động 24h gần nhất — admin xem để chặn 1 chạm."""
    now = time.time()
    blocked_set = set(load_limits().get("blocked_ips", []))
    rows: list[dict] = []
    ips = set(_ip_hits) | set(_ip_blocked)
    for ip in ips:
        _trim(_ip_hits.get(ip, deque()), now, _DAY)
        _trim(_ip_blocked.get(ip, deque()), now, _DAY)
        req = len(_ip_hits.get(ip, ()))
        blk = len(_ip_blocked.get(ip, ()))
        if req == 0 and blk == 0:
            continue
        rows.append({"ip": ip, "requests": req, "blocked": blk, "is_blocked": ip in blocked_set})
    rows.sort(key=lambda r: (-(r["blocked"]), -(r["requests"])))
    return rows[:limit]


def client_ip(request) -> str:
    """IP thật của khách: ưu tiên CF-Connecting-IP (Cloudflare) → X-Forwarded-For → peer."""
    h = request.headers
    return (
        h.get("cf-connecting-ip")
        or (h.get("x-forwarded-for", "").split(",")[0].strip())
        or (request.client.host if request.client else "unknown")
    )
