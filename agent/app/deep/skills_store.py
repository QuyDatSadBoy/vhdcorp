"""Kho SKILL cho DeepAgents — admin cấu hình được từ trang /admin.

Mỗi skill là 1 file SKILL.md theo chuẩn Agent Skills (frontmatter name/description +
nội dung). DeepAgents nạp frontmatter lúc khởi động (nhẹ) và chỉ đọc TOÀN BỘ nội dung
khi model thấy cần (progressive disclosure) → thêm nhiều skill không phình context.

Lưu ở data/skills.local.json (không vào git, sống qua deploy như .env). Backend của
DeepAgents là StateBackend → file skill chỉ nằm trong state của lượt chat, KHÔNG ghi
xuống đĩa thật, nên không có đường cho khách chạm vào hệ thống file.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
import unicodedata
from pathlib import Path
from typing import Any

from app.core.config import get_settings

# Thư mục ảo mà DeepAgents quét skill (POSIX, tương đối với root của backend)
SKILLS_ROOT = "/skills/"
_MAX_SKILLS = 100
_MAX_CONTENT = 20_000


def _path() -> Path:
    return Path(get_settings().chat_db_path).with_name("skills.local.json")


def slugify(name: str) -> str:
    """Tên skill → slug an toàn cho đường dẫn (không dấu, chỉ a-z0-9-)."""
    s = unicodedata.normalize("NFKD", name or "").encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s or "skill"


def _load() -> list[dict[str, Any]]:
    p = _path()
    try:
        raw = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
    except Exception:
        raw = {}
    items = raw.get("skills") if isinstance(raw, dict) else None
    return [s for s in (items or []) if isinstance(s, dict)]


def _save(skills: list[dict[str, Any]]) -> None:
    p = _path()
    p.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(p.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump({"skills": skills}, f, ensure_ascii=False)
        os.replace(tmp, p)
    except Exception:
        if os.path.exists(tmp):
            os.unlink(tmp)


def list_skills() -> list[dict[str, Any]]:
    """Danh sách skill (kèm slug) — dùng cho trang admin."""
    return [{**s, "slug": slugify(s.get("name", ""))} for s in _load()]


def upsert_skill(name: str, description: str, content: str, enabled: bool = True) -> dict:
    """Thêm/sửa 1 skill (khoá theo slug của name)."""
    name = (name or "").strip()
    if not name:
        raise ValueError("Thiếu tên skill")
    content = (content or "").strip()[:_MAX_CONTENT]
    slug = slugify(name)
    skills = _load()
    item = {
        "name": name,
        "description": (description or "").strip(),
        "content": content,
        "enabled": bool(enabled),
    }
    for i, s in enumerate(skills):
        if slugify(s.get("name", "")) == slug:
            skills[i] = item
            break
    else:
        if len(skills) >= _MAX_SKILLS:
            raise ValueError(f"Tối đa {_MAX_SKILLS} skill")
        skills.append(item)
    _save(skills)
    return {**item, "slug": slug}


def delete_skill(slug: str) -> bool:
    skills = _load()
    kept = [s for s in skills if slugify(s.get("name", "")) != slug]
    if len(kept) == len(skills):
        return False
    _save(kept)
    return True


def _skill_md(skill: dict[str, Any]) -> str:
    """Dựng file SKILL.md: frontmatter (name/description) + nội dung.

    `name` phải là slug thường-gạch-nối theo chuẩn Agent Skills (admin gõ tên tiếng Việt
    có dấu vẫn được — tên hiển thị được đưa vào description để model vẫn đọc ra)."""
    display = str(skill.get("name", "")).replace("\n", " ").strip()
    desc = str(skill.get("description", "")).replace("\n", " ").strip()
    body = str(skill.get("content", "")).strip()
    full_desc = f"{display}. {desc}" if desc else display
    return f"---\nname: {slugify(display)}\ndescription: {full_desc}\n---\n\n{body}\n"


def to_files() -> dict[str, dict[str, str]]:
    """Skill đang BẬT → dict `files` truyền vào state DeepAgents (shape FileData)."""
    files: dict[str, dict[str, str]] = {}
    for s in _load():
        if not s.get("enabled", True):
            continue
        if not str(s.get("content", "")).strip():
            continue  # skill rỗng thì bỏ (frontmatter không có nội dung là vô nghĩa)
        files[f"{SKILLS_ROOT}{slugify(s.get('name', ''))}/SKILL.md"] = {
            "content": _skill_md(s),
            "encoding": "utf-8",
        }
    return files
