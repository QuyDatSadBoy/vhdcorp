"""Summary memory: tóm tắt phần hội thoại cũ, lưu trong bảng memory."""

from app.db.repository import MemoryRepo
from app.memory.base import BaseMemory


class SummaryMemory(BaseMemory):
    def __init__(self, memory_repo: MemoryRepo) -> None:
        self.memory_repo = memory_repo

    async def load(self, conversation_id: str) -> str:
        data = await self.memory_repo.get(conversation_id)
        return data["summary"]

    async def save(self, conversation_id: str, value: str) -> None:
        await self.memory_repo.set_summary(conversation_id, value)
