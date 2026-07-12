"""Nạp & tra cứu knowledge.md — thông tin công ty ngoài sản phẩm.

- load_knowledge(): đọc toàn bộ file (cache), reload bằng force=True (khi resync).
- get_context_text(): text rút gọn (bỏ comment HTML) để nhồi vào system prompt.
- search_knowledge_text(query): trả về (các) section liên quan nhất để tool tra cứu.

File mẫu ngắn nên đưa toàn bộ vào context; tool search_knowledge là kênh tra cứu bổ sung.
"""

import logging
import re
from pathlib import Path

from app.core.config import get_settings
from app.tools.products import normalize_vi

logger = logging.getLogger(__name__)

_knowledge: str | None = None
_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)


def load_knowledge(force: bool = False) -> str:
    """Đọc knowledge.md (cache). force=True để nạp lại sau khi khách sửa file."""
    global _knowledge
    if _knowledge is not None and not force:
        return _knowledge
    path = Path(get_settings().knowledge_md_path)
    _knowledge = path.read_text(encoding="utf-8") if path.exists() else ""
    return _knowledge


def get_context_text() -> str:
    """Text đưa vào system prompt (bỏ comment HTML hướng dẫn khách)."""
    text = _COMMENT_RE.sub("", load_knowledge())
    return text.strip()


def _split_sections(text: str) -> list[tuple[str, str]]:
    """Tách theo heading '## ' → list (tiêu đề, nội dung đầy đủ gồm cả heading)."""
    sections: list[tuple[str, str]] = []
    current_title = ""
    current_lines: list[str] = []
    for line in text.splitlines():
        if line.startswith("## "):
            if current_lines:
                sections.append((current_title, "\n".join(current_lines).strip()))
            current_title = line[3:].strip()
            current_lines = [line]
        else:
            current_lines.append(line)
    if current_lines:
        sections.append((current_title, "\n".join(current_lines).strip()))
    # bỏ phần đầu file trước heading ## đầu tiên (thường là tiêu đề # + comment)
    return [(t, c) for t, c in sections if t]


def search_knowledge_text(query: str, max_sections: int = 3) -> str:
    """Xếp hạng các section theo số token khớp (tiếng Việt không dấu) → trả section tốt nhất."""
    text = get_context_text()
    if not text:
        return ""
    sections = _split_sections(text)
    if not sections:
        return ""
    tokens = [t for t in normalize_vi(query).split() if t]
    if not tokens:
        return ""

    scored: list[tuple[float, str]] = []
    for title, content in sections:
        blob = normalize_vi(f"{title} {content}")
        matched = sum(1 for t in tokens if t in blob)
        if matched == 0:
            continue
        score = matched / len(tokens)
        if normalize_vi(query) in blob:
            score += 1.0  # khớp nguyên cụm
        scored.append((score, content))

    scored.sort(key=lambda x: x[0], reverse=True)
    return "\n\n".join(c for _, c in scored[:max_sections])
