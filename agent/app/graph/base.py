"""Base class cho node và graph builder."""

from abc import ABC, abstractmethod

from langgraph.graph import StateGraph

from app.graph.state import AgentState


class BaseNode(ABC):
    """Một node trong graph: có tên + run(state) trả về phần state cập nhật."""

    name: str = "node"

    @abstractmethod
    async def run(self, state: AgentState) -> dict: ...

    async def __call__(self, state: AgentState) -> dict:
        return await self.run(state)


class BaseGraphBuilder(ABC):
    """Builder dựng StateGraph; compile() gắn checkpointer."""

    @abstractmethod
    def build(self) -> StateGraph: ...

    def compile(self, checkpointer=None):
        return self.build().compile(checkpointer=checkpointer)
