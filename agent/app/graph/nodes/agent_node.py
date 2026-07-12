"""Node agent: gọi Gemini (đã bind tools) với system prompt + cửa sổ short-term."""

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import SystemMessage

from app.graph.base import BaseNode
from app.graph.state import AgentState
from app.memory.short_term import ShortTermMemory


class AgentNode(BaseNode):
    name = "agent"

    def __init__(self, llm_with_tools: BaseChatModel, short_term: ShortTermMemory) -> None:
        self.llm = llm_with_tools
        self.short_term = short_term

    async def run(self, state: AgentState) -> dict:
        window = self.short_term.trim(state.get("messages", []))
        llm_input = [SystemMessage(content=state.get("system_prompt", ""))] + window
        response = await self.llm.ainvoke(llm_input)
        return {"messages": [response]}
