"""GuardrailPipeline: chạy tuần tự các guardrail, dừng ở guardrail đầu tiên chặn."""

from app.guardrails.base import BaseGuardrail, GuardrailResult
from app.guardrails.injection import InjectionGuardrail
from app.guardrails.length import LengthGuardrail


class GuardrailPipeline:
    def __init__(self, guardrails: list[BaseGuardrail]) -> None:
        self.guardrails = guardrails

    def check(self, text: str) -> GuardrailResult:
        for guardrail in self.guardrails:
            result = guardrail.check(text)
            if not result.allowed:
                return result
        return GuardrailResult(allowed=True)


def default_pipeline(max_chars: int = 2000) -> GuardrailPipeline:
    return GuardrailPipeline([
        LengthGuardrail(max_chars=max_chars),
        InjectionGuardrail(),
    ])
