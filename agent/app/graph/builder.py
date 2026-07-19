"""ChatGraphBuilder: dựng StateGraph guardrail → context → agent ⇄ tools."""

from langchain_core.messages import AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, START, StateGraph

from app.core.config import Settings
from app.graph.base import BaseGraphBuilder
from app.graph.nodes.agent_node import AgentNode
from app.graph.nodes.context_node import ContextNode
from app.graph.nodes.guardrail_node import GuardrailNode
from app.graph.nodes.tool_node import ToolExecutorNode
from app.graph.state import AgentState
from app.guardrails.pipeline import default_pipeline
from app.memory.short_term import ShortTermMemory
from app.tools.contact import create_quote_request, send_contact_request
from app.tools.knowledge import search_knowledge
from app.tools.products import get_product_detail, search_products
from app.tools.site import (
    add_to_cart,
    get_company_info,
    get_recommendations,
    list_categories,
    search_posts,
)
from app.tools.ui import (
    show_comparison,
    show_contact_form,
    show_faq,
    show_product_carousel,
    show_quote_form,
)
from app.tools.web_search import web_search


def _route_guardrail(state: AgentState) -> str:
    return "blocked" if state.get("guardrail_blocked") else "ok"


def _route_agent(state: AgentState) -> str:
    last = state["messages"][-1]
    if isinstance(last, AIMessage) and last.tool_calls:
        return "tools"
    return "end"


class ChatGraphBuilder(BaseGraphBuilder):
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.tools = [
            # Tra cứu / hành động
            search_products,
            get_product_detail,
            search_knowledge,
            web_search,
            send_contact_request,
            create_quote_request,
            # Phủ đủ module web (đọc trực tiếp DB): tin tức, danh mục, gợi ý, liên hệ
            search_posts,
            list_categories,
            get_recommendations,
            get_company_info,
            add_to_cart,
            # Generative UI — model chủ động render component (§9.2)
            show_product_carousel,
            show_contact_form,
            show_quote_form,
            show_comparison,
            show_faq,
        ]
        self.llm = ChatGoogleGenerativeAI(
            model=settings.agent_model,
            google_api_key=settings.google_api_key,
            temperature=0.3,
            # Chat khách cần REAL-TIME: tắt thinking → TTFT ~1.2s thay vì ~2.4s
            # (đo thật trên VPS với gemini-3-flash-preview).
            thinking_budget=0,
        )
        self.llm_with_tools = self.llm.bind_tools(self.tools)

    def build(self) -> StateGraph:
        short_term = ShortTermMemory(limit=self.settings.short_term_limit)
        pipeline = default_pipeline(max_chars=self.settings.max_input_chars)

        graph = StateGraph(AgentState)
        graph.add_node("guardrail", GuardrailNode(pipeline))
        graph.add_node("context", ContextNode())
        graph.add_node("agent", AgentNode(self.llm_with_tools, short_term))
        graph.add_node("tools", ToolExecutorNode(self.tools))

        graph.add_edge(START, "guardrail")
        graph.add_conditional_edges("guardrail", _route_guardrail, {"blocked": END, "ok": "context"})
        graph.add_edge("context", "agent")
        graph.add_conditional_edges("agent", _route_agent, {"tools": "tools", "end": END})
        graph.add_edge("tools", "agent")
        return graph
