"""Short-term memory: cửa sổ trượt N message cuối (không persist)."""

from typing import Any

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage

from app.memory.base import BaseMemory


class ShortTermMemory(BaseMemory):
    """Chỉ đưa tối đa `limit` message cuối vào context; phần cũ được thay bằng summary."""

    def __init__(self, limit: int = 8) -> None:
        self.limit = limit

    def trim(self, messages: list[BaseMessage]) -> list[BaseMessage]:
        window = list(messages[-self.limit:])
        # Gemini yêu cầu function-call đứng ngay sau user-turn hoặc function-response:
        # cửa sổ phải BẮT ĐẦU bằng HumanMessage (bỏ AIMessage/ToolMessage lẻ đầu cửa sổ —
        # ngữ cảnh cũ đã nằm trong summary nên không mất thông tin).
        while window and not isinstance(window[0], HumanMessage):
            window.pop(0)
        return self._sanitize_tool_pairs(window)

    @staticmethod
    def _sanitize_tool_pairs(window: list[BaseMessage]) -> list[BaseMessage]:
        """Đảm bảo mọi tool_call của AIMessage đều có ToolMessage trả lời ngay sau.

        Gemini yêu cầu function-call/function-response đi theo cặp đúng thứ tự.
        Nếu run trước bị hủy giữa chừng (user bấm Stop) checkpoint có thể chứa
        AIMessage(tool_calls) dang dở → mọi lượt sau sẽ 400 INVALID_ARGUMENT.
        Vá bằng ToolMessage tổng hợp "(bị hủy)" cho tool_call thiếu response.
        """
        out: list[BaseMessage] = []
        i = 0
        while i < len(window):
            msg = window[i]
            tool_calls = getattr(msg, "tool_calls", None) if isinstance(msg, AIMessage) else None
            if not tool_calls:
                out.append(msg)
                i += 1
                continue
            expected = [tc.get("id") for tc in tool_calls if tc.get("id")]
            j = i + 1
            answered: set[str] = set()
            responses: list[BaseMessage] = []
            while j < len(window) and isinstance(window[j], ToolMessage):
                responses.append(window[j])
                answered.add(window[j].tool_call_id)  # type: ignore[union-attr]
                j += 1
            out.append(msg)
            out.extend(responses)
            for tc_id in expected:
                if tc_id not in answered:
                    out.append(
                        ToolMessage(content="(công cụ bị hủy giữa chừng, không có kết quả)", tool_call_id=tc_id)
                    )
            i = j
        return out

    async def load(self, conversation_id: str, *, messages: list[BaseMessage] | None = None) -> Any:
        return self.trim(messages or [])

    async def save(self, conversation_id: str, value: Any) -> None:
        # Cửa sổ trượt tính từ state — không cần persist riêng.
        return None
