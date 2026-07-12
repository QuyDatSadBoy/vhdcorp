"""Node guardrail: chặn input xấu ngay đầu graph, trả lời từ chối lịch sự."""

import logging

from langchain_core.messages import AIMessage, HumanMessage

from app.graph.base import BaseNode
from app.graph.state import AgentState
from app.guardrails.pipeline import GuardrailPipeline

logger = logging.getLogger(__name__)

_REFUSALS = {
    "empty_input": "Bạn chưa nhập nội dung. Bạn cần VHD Corp hỗ trợ gì ạ?",
    "too_long": (
        "Tin nhắn của bạn hơi dài, mình chưa xử lý được. "
        "Bạn tóm tắt lại ngắn gọn giúp mình nhé!"
    ),
    "repeat_spam": (
        "Tin nhắn có vẻ chưa đúng định dạng. "
        "Bạn nhập lại câu hỏi về sản phẩm hoặc dịch vụ của VHD Corp nhé!"
    ),
}

_DEFAULT_REFUSAL = (
    "Xin lỗi, mình không thể hỗ trợ yêu cầu này. "
    "Mình là trợ lý của VHD Corp — bạn có thể hỏi về sản phẩm, giá cả, "
    "tồn kho hoặc để lại thông tin liên hệ để được tư vấn nhé!"
)


class GuardrailNode(BaseNode):
    name = "guardrail"

    def __init__(self, pipeline: GuardrailPipeline) -> None:
        self.pipeline = pipeline

    async def run(self, state: AgentState) -> dict:
        last_user_text = ""
        for msg in reversed(state.get("messages", [])):
            if isinstance(msg, HumanMessage):
                last_user_text = msg.text if isinstance(msg.text, str) else str(msg.content)
                break

        result = self.pipeline.check(last_user_text)
        if result.allowed:
            return {"guardrail_blocked": False}

        logger.info("Guardrail '%s' chặn input: %s", result.guardrail, result.reason)
        refusal = _REFUSALS.get(result.reason, _DEFAULT_REFUSAL)
        return {
            "guardrail_blocked": True,
            "messages": [AIMessage(content=refusal)],
        }
