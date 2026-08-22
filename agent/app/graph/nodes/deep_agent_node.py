"""Node agent chạy bằng DeepAgents — thay cả AgentNode + ToolExecutorNode.

DeepAgents tự lo vòng lặp "gọi model → chạy tool → gọi lại model", nên node này chỉ
đưa vào system prompt (đã dựng ở ContextNode) + cửa sổ hội thoại + file SKILL, rồi trả
các message MỚI về cho graph ngoài. Guardrail/cache/memory/gen-UI vẫn ở ngoài, không đổi.
"""

from langchain_core.messages import SystemMessage

from app.deep import default_skills, skills_store
from app.graph.base import BaseNode
from app.graph.state import AgentState
from app.memory.short_term import ShortTermMemory


class DeepAgentNode(BaseNode):
    name = "agent"

    def __init__(self, deep_agent, short_term: ShortTermMemory) -> None:
        self.agent = deep_agent
        self.short_term = short_term

    async def run(self, state: AgentState) -> dict:
        window = self.short_term.trim(state.get("messages", []))
        agent_input = [SystemMessage(content=state.get("system_prompt", "")), *window]
        # SKILL mặc định của VHD + skill admin tự thêm. Admin ĐỨNG SAU nên skill cùng
        # tên do admin viết sẽ ghi đè bản mặc định (khách toàn quyền sửa nội dung).
        try:
            files = {**default_skills.to_files(), **skills_store.to_files()}
        except Exception:  # noqa: BLE001 — skill lỗi thì chạy không skill, đừng chết chat
            files = {}

        result = await self.agent.ainvoke({"messages": agent_input, "files": files})

        # Chỉ lấy message MỚI: message cũ đã có id (LangGraph gán), message do agent
        # sinh ra thì id khác/None → so theo id an toàn hơn cắt theo độ dài (middleware
        # của DeepAgents có thể chèn thêm message vào giữa).
        seen = {m.id for m in agent_input if getattr(m, "id", None)}
        new = [
            m
            for m in result.get("messages", [])
            if getattr(m, "id", None) not in seen and not isinstance(m, SystemMessage)
        ]
        return {"messages": new}
