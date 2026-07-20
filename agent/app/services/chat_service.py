"""ChatService: orchestration một lượt chat — tạo conversation ở message đầu,
stream sự kiện SSE, lưu message, kích hoạt background memory task."""

import asyncio
import logging
import uuid
from collections.abc import AsyncGenerator

from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.tracers.langchain import wait_for_all_tracers

from app.core.config import Settings
from app.db.repository import ConversationRepo, MemoryRepo, MessageRepo
from app.services import vision
from app.services.memory_service import MemoryService
from app.tools.products import find_products
from app.core import usage
from app.tools.ui import product_to_props, reset_ui_queue, set_ui_queue

logger = logging.getLogger(__name__)


def _provisional_title(message: str, max_words: int = 6) -> str:
    words = message.strip().split()
    title = " ".join(words[:max_words])
    if len(words) > max_words:
        title += "…"
    return title or "Cuộc trò chuyện mới"


def _chunk_text(chunk) -> str:
    """Lấy text từ chunk (content có thể là str hoặc list content blocks)."""
    text = getattr(chunk, "text", None)
    if isinstance(text, str):  # langchain-core 1.x: property (str subclass, vẫn callable)
        return str(text)
    if callable(text):  # langchain-core < 1.0: .text() là method
        return text() or ""
    content = getattr(chunk, "content", "")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            part.get("text", "") for part in content if isinstance(part, dict)
        )
    return ""


class ChatService:
    def __init__(
        self,
        settings: Settings,
        graph,
        conversation_repo: ConversationRepo,
        message_repo: MessageRepo,
        memory_repo: MemoryRepo,
        memory_service: MemoryService,
        llm=None,
    ) -> None:
        self.settings = settings
        self.graph = graph
        self.conversation_repo = conversation_repo
        self.message_repo = message_repo
        self.memory_repo = memory_repo
        self.memory_service = memory_service
        self.llm = llm  # LLM (không bind tools) — dùng cho vision mô tả ảnh
        self.background_tasks: set[asyncio.Task] = set()

    async def stream_chat(
        self,
        user_id: str,
        message: str,
        conversation_id: str | None = None,
        image: str | None = None,
        page: str | None = None,
    ) -> AsyncGenerator[dict, None]:
        """Yield các event dict: conversation / message.delta / tool.start / tool.end / ui / done / error."""
        first_turn = False
        try:
            if conversation_id:
                conv = await self.conversation_repo.get(conversation_id, user_id)
                if conv is None:
                    yield {"type": "error", "message": "Không tìm thấy hội thoại."}
                    return
            else:
                title = _provisional_title(message or "Tìm bằng hình ảnh")
                conv = await self.conversation_repo.create(user_id, title)
                conversation_id = conv["id"]
                first_turn = True
                yield {"type": "conversation", "id": conversation_id, "title": title}

            stored_message = message if not image else (message or "").strip() + " [đã gửi kèm 1 ảnh]"
            await self.message_repo.add(conversation_id, "user", stored_message.strip() or "[Ảnh]")
            memory = await self.memory_repo.get(conversation_id)

            # Gom mọi ui event đã emit để persist kèm assistant message (reload không mất gen-UI)
            emitted_ui: list[dict] = []

            # ── Image search (§9.4): mô tả ảnh → tìm SP → emit ui image-search-result ──
            graph_message = message
            if image:
                desc = ""
                if self.llm is not None:
                    desc = await vision.describe_image(self.llm, image)
                matches = find_products(desc, limit=8) if desc else []
                image_props = {"query": desc, "products": [product_to_props(p) for p in matches]}
                emitted_ui.append({"component": "image-search-result", "props": image_props})
                yield {"type": "ui", "component": "image-search-result", "props": image_props}
                names = ", ".join(p.get("name", "") for p in matches) or "(không khớp sản phẩm nào)"
                graph_message = (
                    f"{message or 'Khách gửi một ảnh sản phẩm, nhờ tư vấn.'}\n\n"
                    f"[Bối cảnh hệ thống — không phải lời khách]: Khách vừa gửi 1 ảnh. "
                    f"Mô tả ảnh: {desc or 'không nhận diện được'}. "
                    f"Sản phẩm trong catalog gần giống: {names}. "
                    "Hãy trả lời tự nhiên bằng tiếng Việt, giới thiệu các sản phẩm này "
                    "(carousel đã hiển thị cho khách), mời khách hỏi thêm hoặc để lại liên hệ."
                )

            state_in = {
                "messages": [HumanMessage(content=graph_message)],
                "summary": memory["summary"],
                "facts": memory["facts"],
                "page_context": page or "",
            }
            config = {"configurable": {"thread_id": conversation_id}}

            # Channel gen-UI: tool show_* ghi lệnh render vào list này, drain sau mỗi tool.end
            ui_commands: list[dict] = []
            token = set_ui_queue(ui_commands)
            parts: list[str] = []
            in_tokens = 0
            out_tokens = 0
            try:
                async for event in self.graph.astream_events(state_in, config=config, version="v2"):
                    kind = event["event"]
                    if kind == "on_chat_model_stream":
                        text = _chunk_text(event["data"]["chunk"])
                        if text:
                            parts.append(text)
                            yield {"type": "message.delta", "content": text}
                    elif kind == "on_chat_model_end":
                        # Token THẬT từ Gemini để tính chi phí (có thể nhiều lần do tool loop)
                        msg = event.get("data", {}).get("output")
                        um = getattr(msg, "usage_metadata", None)
                        if um:
                            in_tokens += int(um.get("input_tokens", 0) or 0)
                            out_tokens += int(um.get("output_tokens", 0) or 0)
                    elif kind == "on_tool_start":
                        # (Không bắn lead-in nữa: FE hiện LOG TIẾN TRÌNH trong lúc tool
                        # chạy, và tự giữ thứ tự chữ → card bằng cách hoãn gắn card
                        # đến khi text stream xong.)
                        yield {"type": "tool.start", "name": event.get("name", "")}
                    elif kind == "on_tool_end":
                        yield {"type": "tool.end", "name": event.get("name", "")}
                        # Emit ui event TRƯỚC message.delta của lời dẫn (§9.2)
                        while ui_commands:
                            cmd = ui_commands.pop(0)
                            emitted_ui.append({"component": cmd["component"], "props": cmd["props"]})
                            yield {
                                "type": "ui",
                                "component": cmd["component"],
                                "props": cmd["props"],
                            }
            finally:
                reset_ui_queue(token)
                # An toàn: drain nốt nếu còn lệnh chưa emit
                for cmd in ui_commands:
                    emitted_ui.append({"component": cmd["component"], "props": cmd["props"]})
                    yield {"type": "ui", "component": cmd["component"], "props": cmd["props"]}
                ui_commands.clear()

            final_text = "".join(parts)
            if not final_text:
                # Guardrail chặn (không có LLM stream) → lấy câu từ chối từ state cuối
                snapshot = await self.graph.aget_state(config)
                for msg in reversed(snapshot.values.get("messages", [])):
                    if isinstance(msg, AIMessage):
                        final_text = _chunk_text(msg)
                        break
                if final_text:
                    yield {"type": "message.delta", "content": final_text}

            message_id = await self.message_repo.add(
                conversation_id, "assistant", final_text, ui_blocks=emitted_ui
            )
            await self.conversation_repo.touch(conversation_id)
            usage.record_request(in_tokens, out_tokens)  # thống kê chi phí (token thật)
            yield {"type": "done", "message_id": message_id}

            self._spawn_background(
                self.memory_service.post_turn(conversation_id, first_turn=first_turn)
            )
            # Xả trace LangSmith sau khi stream xong → run LLM không kẹt "pending"
            # (astream_events + streaming để lại run chưa flush). Chạy nền, không chặn.
            self._spawn_background(asyncio.to_thread(wait_for_all_tracers))
        except Exception as exc:  # noqa: BLE001 — luôn trả event error cho client
            logger.exception("Lỗi stream_chat (conversation=%s)", conversation_id)
            yield {"type": "error", "message": f"Có lỗi xảy ra: {exc}"}

    def _spawn_background(self, coro) -> None:
        task = asyncio.create_task(coro)
        self.background_tasks.add(task)
        task.add_done_callback(self.background_tasks.discard)

    async def wait_background(self) -> None:
        """Chờ các task nền (dùng khi shutdown/test)."""
        if self.background_tasks:
            await asyncio.gather(*list(self.background_tasks), return_exceptions=True)

    async def run_once(self, message: str) -> str:
        """Chạy agent 1 lượt STATELESS (dùng cho A2A) — không lưu conversation.

        Vẫn qua guardrail → context → agent ⇄ tools; dùng thread tạm rồi xóa checkpoint."""
        thread_id = f"a2a-{uuid.uuid4()}"
        config = {"configurable": {"thread_id": thread_id}}
        state_in = {"messages": [HumanMessage(content=message)], "summary": "", "facts": []}
        try:
            result = await self.graph.ainvoke(state_in, config=config)
        finally:
            checkpointer = getattr(self.graph, "checkpointer", None)
            if checkpointer is not None:
                try:
                    await checkpointer.adelete_thread(thread_id)
                except Exception:  # noqa: BLE001 — dọn checkpoint lỗi không chặn kết quả
                    logger.exception("Không xóa được checkpoint A2A thread %s", thread_id)
        for msg in reversed(result.get("messages", [])):
            if isinstance(msg, AIMessage):
                text = _chunk_text(msg)
                if text:
                    return text
        return "Xin lỗi, mình chưa tạo được câu trả lời."
