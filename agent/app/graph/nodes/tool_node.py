"""Node tools: thực thi tool calls qua langgraph ToolNode (lỗi tool → ToolMessage, không crash)."""

from langgraph.prebuilt import ToolNode

from app.graph.base import BaseNode
from app.graph.state import AgentState


class ToolExecutorNode(BaseNode):
    name = "tools"

    def __init__(self, tools: list) -> None:
        self._tool_node = ToolNode(tools, handle_tool_errors=True)

    async def run(self, state: AgentState) -> dict:
        return await self._tool_node.ainvoke(state)
