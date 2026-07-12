"""Base class cho các loại memory."""

from abc import ABC, abstractmethod
from typing import Any


class BaseMemory(ABC):
    """Giao diện chung: load() lấy dữ liệu memory, save() lưu lại."""

    @abstractmethod
    async def load(self, conversation_id: str) -> Any: ...

    @abstractmethod
    async def save(self, conversation_id: str, value: Any) -> None: ...
