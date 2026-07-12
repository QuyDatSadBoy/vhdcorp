"""Long-term memory: facts về khách (tên, nhu cầu, liên hệ...), lưu trong bảng memory."""

from app.db.repository import MemoryRepo
from app.memory.base import BaseMemory


class LongTermMemory(BaseMemory):
    def __init__(self, memory_repo: MemoryRepo) -> None:
        self.memory_repo = memory_repo

    async def load(self, conversation_id: str) -> list[str]:
        data = await self.memory_repo.get(conversation_id)
        return data["facts"]

    async def save(self, conversation_id: str, value: list[str]) -> None:
        await self.memory_repo.set_facts(conversation_id, value)
