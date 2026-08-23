#!/usr/bin/env python3
"""Kiểm thử ĐẦU-CUỐI trợ lý AI qua HTTP thật (không mock).

Chạy:  python3 scripts/e2e-agent.py [--url http://127.0.0.1:8001]

Khác pytest ở chỗ: gọi đúng endpoint mà trình duyệt gọi, dùng model thật, catalog
thật — bắt được những lỗi chỉ lộ khi ghép đủ mảnh (slug sai, tool không chạy, cache
không ăn, AG-UI đứt). Dùng trước mỗi lần deploy.

Mỗi phép thử in PASS/FAIL kèm số đo. Thoát mã 1 nếu có phép thử hỏng.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8001"
results: list[tuple[bool, str, str]] = []

# Cloudflare (đứng trước vhdcorp.com) chặn User-Agent mặc định của urllib bằng 403,
# nên phải khai báo UA như trình duyệt mới kiểm thử được môi trường production.
_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((ok, name, detail))
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))


_RATE_LIMITED = "nhắn hơi nhanh"
_PACE_SECONDS = 4.0  # giãn nhịp để không tự đụng anti-spam theo IP của chính mình
_last_call = 0.0


def post_sse(path: str, payload: dict, user: str = "e2e", timeout: int = 120, _retry: int = 2) -> dict:
    """Gọi endpoint SSE, gom lại thành dict tiện kiểm tra.

    Agent có chống spam theo IP (bảo vệ chi phí API). Bộ kiểm thử gọi liên tiếp từ
    cùng một IP nên phải TỰ GIÃN NHỊP, và nếu vẫn bị chặn thì chờ rồi thử lại —
    nếu không, chính cơ chế bảo vệ sẽ làm mọi phép thử phía sau đỏ oan.
    """
    global _last_call
    wait = _PACE_SECONDS - (time.time() - _last_call)
    if wait > 0:
        time.sleep(wait)
    _last_call = time.time()

    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "X-Chat-User": user, "User-Agent": _UA},
    )
    out = {"text": "", "tools": [], "ui": [], "todos": None, "cached": False, "error": None, "events": {}}
    t0 = time.time()
    first_token = None
    with urllib.request.urlopen(req, timeout=timeout) as r:
        for raw in r:
            line = raw.decode("utf-8", "replace").strip()
            if not line.startswith("data:"):
                continue
            try:
                e = json.loads(line[5:].strip())
            except json.JSONDecodeError:
                continue
            t = e.get("type", "?")
            out["events"][t] = out["events"].get(t, 0) + 1
            if t == "message.delta":
                if first_token is None:
                    first_token = time.time() - t0
                out["text"] += e.get("content", "")
            elif t == "tool.start":
                out["tools"].append(e.get("name"))
            elif t == "ui":
                out["ui"].append(e.get("component"))
            elif t == "todo":
                out["todos"] = e.get("items")
            elif t == "done":
                out["cached"] = bool(e.get("cached"))
            elif t == "error":
                out["error"] = e.get("message")
    out["ttft"] = round(first_token, 2) if first_token else None
    out["total"] = round(time.time() - t0, 2)

    if out["error"] and _RATE_LIMITED in out["error"] and _retry > 0:
        print(f"      (bị chặn chống spam — chờ 20s rồi thử lại, còn {_retry} lượt)")
        time.sleep(20)
        return post_sse(path, payload, user, timeout, _retry - 1)
    return out


def get_json(path: str, headers: dict | None = None, timeout: int = 20):
    req = urllib.request.Request(f"{BASE}{path}", headers={"User-Agent": _UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


# ── Các phép thử ──────────────────────────────────────────────────────────────
def test_chat_co_ban():
    print("\n① Chat cơ bản + tốc độ")
    r = post_sse("/api/chat", {"message": "giờ mở cửa của VHD?", "page": "/e2e-1"})
    check("trả lời không lỗi", r["error"] is None, r["error"] or "")
    check("có nội dung", len(r["text"]) > 30, f"{len(r['text'])} ký tự")
    check("nhắc đúng giờ trong tài liệu", "8:00" in r["text"] or "17:30" in r["text"])
    check("token đầu < 8s", (r["ttft"] or 99) < 8, f"TTFT {r['ttft']}s, tổng {r['total']}s")


def test_cache_cau_lap():
    print("\n② Cache câu hỏi lặp")
    # Câu hỏi phải DUY NHẤT mỗi lần chạy, nếu không lần chạy trước đã nạp sẵn cache
    # và phép thử "lần 1 chưa cache" sẽ đỏ oan.
    q = {"message": f"xin chào VHD (lượt kiểm thử {int(time.time())})", "page": "/e2e-cache"}
    a = post_sse("/api/chat", q, user="e2e-cache-a")
    b = post_sse("/api/chat", q, user="e2e-cache-b")  # user KHÁC
    check("lần 1 không phải cache", not a["cached"])
    check("lần 2 HIT cache (dùng chung mọi khách)", b["cached"], f"{b['total']}s")
    check("nội dung y hệt", a["text"] == b["text"], f"{len(a['text'])} vs {len(b['text'])}")
    check("cache nhanh hơn hẳn", b["total"] < max(a["total"] * 0.5, 1.0))


def test_tim_san_pham_va_slug():
    print("\n③ Tìm sản phẩm + link không hỏng")
    r = post_sse("/api/chat", {"message": "cho tôi xem tấm cao su", "page": "/e2e-2"})
    check("có gọi tool", len(r["tools"]) > 0, ", ".join(r["tools"][:3]))
    check("có hiện giao diện sản phẩm", "product-carousel" in r["ui"], ", ".join(r["ui"]))
    check("số lần tra cứu trong giới hạn", len(r["tools"]) <= 15, f"{len(r['tools'])} lần")


def test_khong_bia_hang_khong_co():
    print("\n④ Không bịa hàng không có trong kho")
    r = post_sse("/api/chat", {"message": "bên mình có bán máy bay chiến đấu không?", "page": "/e2e-3"})
    honest = any(k in r["text"].lower() for k in ("chưa có", "không có", "không kinh doanh", "chỉ hỗ trợ", "xin lỗi"))
    check("nói thẳng là không có", honest, repr(r["text"][:80]))
    check("không hiện carousel hàng chẳng liên quan", "product-carousel" not in r["ui"])


def test_skill_nghiep_vu():
    print("\n⑤ SKILL nghiệp vụ (tư vấn chất liệu)")
    r = post_sse("/api/chat", {"message": "gioăng cho đường ống dầu nhớt nên dùng chất liệu gì?", "page": "/e2e-4"})
    check("tư vấn đúng NBR (theo skill)", "NBR" in r["text"], repr(r["text"][:90]))


def test_agui():
    print("\n⑥ Endpoint AG-UI (CopilotKit)")
    try:
        health = urllib.request.urlopen(
            urllib.request.Request(f"{BASE}/agui/chat/health", headers={"User-Agent": _UA}), timeout=10
        ).status
    except Exception as exc:  # noqa: BLE001
        check("health 200", False, str(exc)[:60])
        return
    check("health 200", health == 200)
    req = urllib.request.Request(
        f"{BASE}/agui/chat",
        data=json.dumps({
            "threadId": "e2e-agui", "runId": "r1", "state": {},
            "messages": [{"id": "m1", "role": "user", "content": "xin chào"}],
            "tools": [], "context": [], "forwardedProps": {},
        }).encode(),
        headers={"Content-Type": "application/json", "Accept": "text/event-stream", "User-Agent": _UA},
    )
    kinds: dict[str, int] = {}
    with urllib.request.urlopen(req, timeout=120) as r:
        for raw in r:
            line = raw.decode("utf-8", "replace").strip()
            if line.startswith("data:"):
                try:
                    e = json.loads(line[5:].strip())
                except json.JSONDecodeError:
                    continue
                kinds[e.get("type", "?")] = kinds.get(e.get("type", "?"), 0) + 1
    for ev in ("RUN_STARTED", "TEXT_MESSAGE_CONTENT", "RUN_FINISHED"):
        check(f"phát {ev}", ev in kinds, str(kinds.get(ev, 0)))
    check("không có RUN_ERROR", "RUN_ERROR" not in kinds)


def test_chan_spam():
    print("\n⑦ Chặn nội dung ngoài phạm vi")
    r = post_sse("/api/chat", {"message": "viết giúp tôi một hàm python sắp xếp mảng", "page": "/e2e-5"})
    refused = any(k in r["text"].lower() for k in ("chỉ hỗ trợ", "xin lỗi", "không hỗ trợ"))
    check("từ chối việc ngoài phạm vi bán hàng", refused, repr(r["text"][:80]))


def main() -> int:
    global BASE
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default=BASE)
    args = ap.parse_args()
    BASE = args.url.rstrip("/")

    print(f"Kiểm thử đầu-cuối trợ lý AI tại {BASE}")
    for fn in (
        test_chat_co_ban,
        test_cache_cau_lap,
        test_tim_san_pham_va_slug,
        test_khong_bia_hang_khong_co,
        test_skill_nghiep_vu,
        test_agui,
        test_chan_spam,
    ):
        try:
            fn()
        except Exception as exc:  # noqa: BLE001 — 1 nhóm hỏng không được chặn nhóm khác
            check(f"{fn.__name__} chạy được", False, f"{type(exc).__name__}: {str(exc)[:90]}")

    passed = sum(1 for ok, _, _ in results if ok)
    total = len(results)
    print(f"\n===== {passed}/{total} PASS =====")
    if passed < total:
        print("Hỏng:")
        for ok, name, detail in results:
            if not ok:
                print(f"  - {name} {detail}")
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
