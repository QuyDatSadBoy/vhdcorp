"""Guardrail: pattern prompt-injection / system-override (EN + VI)."""

import re
import unicodedata

from app.guardrails.base import BaseGuardrail, GuardrailResult


def _normalize(text: str) -> str:
    """lowercase + bỏ dấu tiếng Việt để bắt biến thể không dấu."""
    text = text.lower().replace("đ", "d")
    text = unicodedata.normalize("NFD", text)
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|messages?)",
    r"disregard\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|prompts?|rules?)",
    r"forget\s+(all\s+)?(previous|prior|your)\s+(instructions?|rules?)",
    r"(reveal|show|print|display|repeat|output|leak)\b.{0,40}\b(system\s*prompt|instructions?|hidden\s+prompt)",
    r"\bsystem\s*prompt\b",
    r"\bjailbreak\b",
    r"\bdeveloper\s+mode\b",
    r"you\s+are\s+now\s+(a|an|in)\b",
    r"pretend\s+(to\s+be|you\s+are)",
    r"act\s+as\s+(if\s+you|a\s+different|dan\b)",
    r"override\s+(your\s+)?(instructions?|rules?|guidelines?)",
    # Tiếng Việt (đã normalize bỏ dấu)
    r"bo\s+qua\s+(cac\s+|moi\s+|tat\s+ca\s+)?(huong\s+dan|chi\s+dan|chi\s+thi|quy\s+tac|lenh)",
    r"(tiet\s+lo|hien\s+thi|in\s+ra|cho\s+xem)\b.{0,40}\b(prompt|huong\s+dan\s+he\s+thong|chi\s+dan\s+he\s+thong)",
    r"quen\s+(het\s+|toan\s+bo\s+)?(huong\s+dan|chi\s+dan|quy\s+tac)",
    r"gia\s+vo\s+(la|ban\s+la)",
]

_COMPILED = [re.compile(p, re.IGNORECASE) for p in _PATTERNS]


class InjectionGuardrail(BaseGuardrail):
    name = "injection"

    def check(self, text: str) -> GuardrailResult:
        normalized = _normalize(text or "")
        for pattern in _COMPILED:
            if pattern.search(normalized):
                return self._blocked(f"injection_pattern:{pattern.pattern[:40]}")
        return self._ok()
