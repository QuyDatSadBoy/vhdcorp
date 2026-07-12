"""AgentState cho LangGraph StateGraph."""

from typing import Annotated, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict, total=False):
    messages: Annotated[list[BaseMessage], add_messages]
    summary: str
    facts: list[str]
    guardrail_blocked: bool
    system_prompt: str
