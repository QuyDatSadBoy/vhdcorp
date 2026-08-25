"""Chế độ hoạt động của trợ lý — admin chỉnh, khách nhìn thấy mình đang nói chuyện với ai.

Ba mức, khác nhau ở PHẠM VI được phép giúp chứ không phải ở mức độ an toàn:

- `chat_chan`  : chỉ việc của VHD (bán hàng, sản phẩm, chính sách). Hỏi ngoài phạm vi
                 thì từ chối. Dùng khi muốn trợ lý tuyệt đối không lan man.
- `tieu_chuan` : mặc định — việc của VHD là chính, nhưng vẫn giúp những câu đời thường
                 quanh đó (đơn vị đo, quy đổi, soạn email hỏi hàng…).
- `mo_rong`    : trợ lý đa năng, giúp mọi việc hợp pháp như một trợ lý AI thường, vẫn
                 ưu tiên chuyện VHD khi liên quan.

Mọi mức đều GIỮ NGUYÊN các chặn về an toàn (chống chiếm quyền câu lệnh, chống lộ chỉ
dẫn hệ thống, giới hạn độ dài). Nới lỏng ở đây là nới PHẠM VI CHỦ ĐỀ, không phải nới
bảo mật — hai thứ đó không được lẫn vào nhau.

Admin thêm được luật riêng: mỗi luật là một câu tiếng Việt ghép thẳng vào chỉ dẫn.
Lưu: data/agent_mode.local.json.
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)

MODES = ("chat_chan", "tieu_chuan", "mo_rong")
DEFAULT_MODE = "tieu_chuan"
_MAX_RULES = 20
_MAX_RULE_LEN = 300

# Nhãn + mô tả cho giao diện (khách và admin đọc cùng một cách gọi)
MODE_INFO: dict[str, dict[str, str]] = {
    "chat_chan": {
        "label": "Chỉ việc VHD",
        "hint": "Trợ lý chỉ trả lời về sản phẩm, báo giá và chính sách của VHD Corp.",
    },
    "tieu_chuan": {
        "label": "Tiêu chuẩn",
        "hint": "Trợ lý tập trung vào việc của VHD, vẫn giúp được vài việc đời thường liên quan.",
    },
    "mo_rong": {
        "label": "Mở rộng",
        "hint": "Trợ lý giúp được nhiều việc khác ngoài VHD — hỏi gì cũng thử giúp.",
    },
}

# Đoạn chỉ dẫn ghép vào persona theo từng mức
_MODE_PROMPT = {
    "chat_chan": (
        "PHẠM VI: CHỈ trả lời việc của VHD Corp (sản phẩm, giá, đơn hàng, chính sách, "
        "kỹ thuật vật tư). Câu hỏi ngoài phạm vi: từ chối ngắn gọn, lịch sự, rồi mời "
        "khách quay lại chuyện sản phẩm. KHÔNG làm hộ việc chung chung."
    ),
    "tieu_chuan": (
        "PHẠM VI: việc của VHD Corp là chính. Câu hỏi đời thường có liên quan tới việc "
        "mua bán (quy đổi đơn vị, tính số lượng, soạn giúp email hỏi hàng, giải thích "
        "thuật ngữ kỹ thuật) thì cứ giúp ngắn gọn. Việc hoàn toàn không liên quan thì "
        "từ chối lịch sự và kéo về chuyện sản phẩm."
    ),
    "mo_rong": (
        "PHẠM VI: bạn là trợ lý đa năng. Giúp khách MỌI việc hợp pháp họ nhờ — viết lách, "
        "tính toán, tra cứu, giải thích, lập kế hoạch — với cùng sự cẩn thận. Khi câu hỏi "
        "liên quan tới vật tư/đơn hàng thì vẫn ưu tiên dữ liệu thật của VHD Corp và tra "
        "cứu bằng công cụ thay vì nói theo trí nhớ."
    ),
}

_cache: dict[str, Any] | None = None


def _path() -> Path:
    return Path(get_settings().chat_db_path).with_name("agent_mode.local.json")


def _load() -> dict[str, Any]:
    global _cache
    if _cache is None:
        p = _path()
        try:
            _cache = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
        except Exception:  # noqa: BLE001 — file hỏng không được chặn chat
            logger.exception("Không đọc được cấu hình chế độ — dùng mặc định")
            _cache = {}
        if _cache.get("mode") not in MODES:
            _cache["mode"] = DEFAULT_MODE
        _cache.setdefault("rules", [])
    return _cache


def get_mode() -> str:
    return _load()["mode"]


def get_rules() -> list[str]:
    return list(_load()["rules"])


def get_state() -> dict[str, Any]:
    """Trạng thái đầy đủ cho giao diện (khách chỉ cần mode + nhãn, admin cần cả luật)."""
    mode = get_mode()
    return {
        "mode": mode,
        "label": MODE_INFO[mode]["label"],
        "hint": MODE_INFO[mode]["hint"],
        "rules": get_rules(),
        "modes": [{"id": m, **MODE_INFO[m]} for m in MODES],
    }


def save(mode: str | None = None, rules: list[str] | None = None) -> dict[str, Any]:
    """Ghi cấu hình mới. Trả về trạng thái sau khi ghi."""
    data = dict(_load())
    if mode is not None:
        if mode not in MODES:
            raise ValueError(f"Chế độ phải là một trong: {', '.join(MODES)}")
        data["mode"] = mode
    if rules is not None:
        cleaned = [str(r).strip()[:_MAX_RULE_LEN] for r in rules if str(r).strip()]
        data["rules"] = cleaned[:_MAX_RULES]

    p = _path()
    p.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(p.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, p)
    except Exception:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise
    globals()["_cache"] = data
    return get_state()


def prompt_block() -> str:
    """Đoạn chỉ dẫn ghép vào persona theo chế độ + luật riêng của admin."""
    parts = [_MODE_PROMPT[get_mode()]]
    rules = get_rules()
    if rules:
        parts.append("LUẬT RIÊNG CỦA CỬA HÀNG (ưu tiên cao, tuân thủ đúng chữ):")
        parts.extend(f"- {r}" for r in rules)
    return "\n".join(parts)
