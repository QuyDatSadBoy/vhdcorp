"""Đọc SKILL viết sẵn từ FILE trên đĩa (không nhúng nội dung trong code).

Vị trí:
- `agent/skills/`        — skill cho trợ lý bán hàng ở trang khách
- `agent/skills-admin/`  — skill cho trợ lý điều hành ở trang admin

Mỗi skill là 1 thư mục chứa `SKILL.md` theo chuẩn Agent Skills:

    skills/bao-gia-si/SKILL.md
    ---
    name: bao-gia-si                 # slug thường-gạch-nối (bắt buộc theo spec)
    description: mô tả 1 dòng        # model đọc dòng này để quyết định có mở skill không
    ---
    # nội dung markdown…

Sửa nội dung = sửa file rồi khởi động lại agent (hoặc dùng trang admin để ghi đè).
Nguyên tắc khi viết: chỉ mô tả QUY TRÌNH (hỏi gì, tra tool nào, thứ tự nào). Không nhúng
dữ liệu kinh doanh (giá, bậc chiết khấu, tồn kho, thời gian giao) — những thứ đó phải tra
bằng tool, viết cứng vào skill là agent sẽ nói ra số liệu sai một cách rất thuyết phục.
"""

from __future__ import annotations

import logging
from pathlib import Path

from app.core.config import AGENT_DIR

logger = logging.getLogger(__name__)

CLIENT_SKILLS_DIR = AGENT_DIR / "skills"
ADMIN_SKILLS_DIR = AGENT_DIR / "skills-admin"
_MAX_BYTES = 40_000  # chốt an toàn: 1 file skill khổng lồ không được làm phình context


def _read_dir(base: Path) -> dict[str, dict[str, str]]:
    """Quét `base/*/SKILL.md` → dict `files` (shape FileData) cho state DeepAgents."""
    from app.deep.skills_store import SKILLS_ROOT

    files: dict[str, dict[str, str]] = {}
    if not base.is_dir():
        return files
    for path in sorted(base.glob("*/SKILL.md")):
        try:
            content = path.read_text(encoding="utf-8")
        except OSError:
            logger.warning("Không đọc được skill %s", path)
            continue
        if not content.strip():
            continue
        if len(content.encode("utf-8")) > _MAX_BYTES:
            logger.warning("Skill %s quá lớn (>%d bytes) → bỏ qua", path, _MAX_BYTES)
            continue
        files[f"{SKILLS_ROOT}{path.parent.name}/SKILL.md"] = {
            "content": content,
            "encoding": "utf-8",
        }
    return files


def to_files() -> dict[str, dict[str, str]]:
    """SKILL viết sẵn cho trợ lý bán hàng (trang khách)."""
    return _read_dir(CLIENT_SKILLS_DIR)


def admin_to_files() -> dict[str, dict[str, str]]:
    """SKILL viết sẵn cho trợ lý điều hành (trang admin)."""
    return _read_dir(ADMIN_SKILLS_DIR)


def list_names(base: Path | None = None) -> list[str]:
    """Tên thư mục các skill đang có trên đĩa — dùng cho trang admin/chẩn đoán."""
    d = base or CLIENT_SKILLS_DIR
    return sorted(p.parent.name for p in d.glob("*/SKILL.md")) if d.is_dir() else []
