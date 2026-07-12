"""Base class cho guardrails."""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class GuardrailResult:
    allowed: bool
    reason: str = ""
    guardrail: str = ""


class BaseGuardrail(ABC):
    """Mỗi guardrail kiểm tra một khía cạnh của input người dùng."""

    name: str = "guardrail"

    @abstractmethod
    def check(self, text: str) -> GuardrailResult:
        """Trả về GuardrailResult(allowed=False, reason=...) nếu input bị chặn."""

    def _blocked(self, reason: str) -> GuardrailResult:
        return GuardrailResult(allowed=False, reason=reason, guardrail=self.name)

    def _ok(self) -> GuardrailResult:
        return GuardrailResult(allowed=True, guardrail=self.name)
