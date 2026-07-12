"""MemoryService: chạy NỀN sau mỗi lượt — auto-title, tóm tắt phần cũ, trích facts."""

import json
import logging
import re

from langchain_core.language_models import BaseChatModel

from app.core.config import Settings
from app.db.repository import ConversationRepo, MessageRepo
from app.memory.long_term import LongTermMemory
from app.memory.summary import SummaryMemory

logger = logging.getLogger(__name__)


def _msg_text(response) -> str:
    text = getattr(response, "text", "")
    if not isinstance(text, str) and callable(text):
        text = text()
    return str(text or "").strip()


class MemoryService:
    def __init__(
        self,
        settings: Settings,
        llm: BaseChatModel,
        conversation_repo: ConversationRepo,
        message_repo: MessageRepo,
        summary_memory: SummaryMemory,
        long_term_memory: LongTermMemory,
    ) -> None:
        self.settings = settings
        self.llm = llm
        self.conversation_repo = conversation_repo
        self.message_repo = message_repo
        self.summary_memory = summary_memory
        self.long_term_memory = long_term_memory

    async def post_turn(self, conversation_id: str, first_turn: bool) -> None:
        """Task nền sau khi đã trả lời xong — mọi lỗi chỉ log, không ảnh hưởng chat."""
        try:
            messages = await self.message_repo.list(conversation_id)
            if first_turn and messages:
                await self._auto_title(conversation_id, messages[0]["content"])
            if len(messages) > self.settings.short_term_limit:
                await self._summarize(conversation_id, messages)
            await self._extract_facts(conversation_id, messages)
            # Hội thoại có thể bị xóa trong lúc task nền chạy → dọn memory mồ côi
            if not await self.conversation_repo.exists(conversation_id):
                await self.summary_memory.memory_repo.delete(conversation_id)
        except Exception:  # noqa: BLE001 — task nền không được nổ
            logger.exception("Lỗi background memory task (conversation=%s)", conversation_id)

    async def _auto_title(self, conversation_id: str, first_message: str) -> None:
        prompt = (
            "Đặt tiêu đề tiếng Việt NGẮN GỌN (tối đa 6 từ, không dấu ngoặc kép, "
            "không dấu chấm cuối) cho cuộc hội thoại bắt đầu bằng tin nhắn sau:\n"
            f"\"{first_message[:500]}\"\n"
            "Chỉ trả về tiêu đề, không giải thích."
        )
        response = await self.llm.ainvoke(prompt)
        title = _msg_text(response).strip('"“” ').strip()
        words = title.split()
        if words:
            title = " ".join(words[:6])
            await self.conversation_repo.set_title(conversation_id, title)

    async def _summarize(self, conversation_id: str, messages: list[dict]) -> None:
        old_messages = messages[: -self.settings.short_term_limit]
        if not old_messages:
            return
        existing = await self.summary_memory.load(conversation_id)
        transcript = "\n".join(f"[{m['role']}] {m['content'][:400]}" for m in old_messages)
        prompt = (
            "Tóm tắt hội thoại giữa khách hàng và trợ lý VHD Corp thành tối đa 5 câu tiếng Việt, "
            "giữ lại: sản phẩm khách quan tâm, giá đã báo, yêu cầu và thông tin khách cung cấp.\n"
        )
        if existing:
            prompt += f"Tóm tắt hiện có:\n{existing}\n"
        prompt += f"Các tin nhắn cũ:\n{transcript}\n\nChỉ trả về bản tóm tắt."
        response = await self.llm.ainvoke(prompt)
        summary = _msg_text(response)
        if summary:
            await self.summary_memory.save(conversation_id, summary)

    async def _extract_facts(self, conversation_id: str, messages: list[dict]) -> None:
        recent = messages[-4:]
        user_texts = [m["content"] for m in recent if m["role"] == "user"]
        if not user_texts:
            return
        existing = await self.long_term_memory.load(conversation_id)
        prompt = (
            "Từ các tin nhắn sau của khách hàng, trích các fact hữu ích về khách "
            "(tên, email, SĐT, công ty, nhu cầu/sản phẩm quan tâm, số lượng cần mua). "
            'Trả về DUY NHẤT một JSON array các chuỗi tiếng Việt, ví dụ: ["Tên khách: Nam"]. '
            "Nếu không có fact nào mới, trả về [].\n"
            f"Facts đã biết: {json.dumps(existing, ensure_ascii=False)}\n"
            "Tin nhắn:\n" + "\n".join(f"- {t[:300]}" for t in user_texts)
        )
        response = await self.llm.ainvoke(prompt)
        text = _msg_text(response)
        match = re.search(r"\[.*\]", text, re.DOTALL)
        if not match:
            return
        try:
            new_facts = json.loads(match.group(0))
        except json.JSONDecodeError:
            return
        if not isinstance(new_facts, list):
            return
        merged = list(existing)
        for fact in new_facts:
            if isinstance(fact, str) and fact and fact not in merged:
                merged.append(fact)
        if merged != existing:
            await self.long_term_memory.save(conversation_id, merged[:20])
