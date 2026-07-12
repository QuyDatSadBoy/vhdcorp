"""Guardrail: input rỗng, quá dài hoặc spam lặp ký tự."""

import re

from app.guardrails.base import BaseGuardrail, GuardrailResult

_REPEAT_SPAM = re.compile(r"(.)\1{29,}")  # 30+ ký tự giống nhau liên tiếp


class LengthGuardrail(BaseGuardrail):
    name = "length"

    def __init__(self, max_chars: int = 2000) -> None:
        self.max_chars = max_chars

    def check(self, text: str) -> GuardrailResult:
        stripped = (text or "").strip()
        if not stripped:
            return self._blocked("empty_input")
        if len(stripped) > self.max_chars:
            return self._blocked("too_long")
        if _REPEAT_SPAM.search(stripped):
            return self._blocked("repeat_spam")
        return self._ok()
