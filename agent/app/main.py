"""FastAPI app factory: CORS, lifespan (SQLite + checkpointer + MCP), wiring các service."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from app.api import a2a as a2a_api
from app.api import admin as admin_api
from app.api import admin_ai as admin_ai_api
from app.api import admin_deep as admin_deep_api
from app.api import chat as chat_api
from app.api import conversations as conversations_api
from app.api import health as health_api
from app.api import tts as tts_api
from app.core.config import configure_tracing, get_settings
from app.core.logging import setup_logging
from app.db.database import Database
from app.db.repository import ConversationRepo, MemoryRepo, MessageRepo
from app.graph.builder import ChatGraphBuilder
from app.mcp_server import build_mcp
from app.memory.long_term import LongTermMemory
from app.memory.summary import SummaryMemory
from app.services.chat_service import ChatService
from app.services.knowledge import load_knowledge
from app.services.memory_service import MemoryService
from app.services.product_sync import sync_products
from app.tools.products import load_catalog

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    setup_logging()

    # Đồng bộ catalog từ BE trước khi nạp (fallback file cũ nếu BE lỗi/không chạy — KHÔNG crash).
    try:
        count = await sync_products(settings.be_api_url, settings.products_json_path)
        logger.info("Đã đồng bộ %d sản phẩm PUBLISHED từ BE", count)
    except Exception as exc:  # noqa: BLE001 — BE lỗi không được chặn khởi động
        logger.warning("Không đồng bộ được sản phẩm từ BE (%s) — dùng products.json hiện có", exc)

    catalog = load_catalog(force=True)
    logger.info("Đã nạp %d sản phẩm từ catalog", len(catalog))

    load_knowledge(force=True)  # nạp knowledge.md (thông tin công ty ngoài sản phẩm)

    # Real-time 100%: BE push webhook resync ngay khi admin sửa sản phẩm;
    # vòng lặp 30s này là lưới an toàn (sửa DB trực tiếp / webhook lỗi mạng).
    async def _periodic_product_sync() -> None:
        last_count = len(catalog)
        while True:
            await asyncio.sleep(30)
            try:
                n = await sync_products(settings.be_api_url, settings.products_json_path)
                load_catalog(force=True)
                if n != last_count:
                    logger.info("Catalog đổi: %d → %d sản phẩm (auto-sync 30s)", last_count, n)
                    last_count = n
            except Exception:  # noqa: BLE001 — BE tạm chết không được giết vòng lặp
                logger.debug("Auto-sync sản phẩm thất bại (BE offline?) — sẽ thử lại sau 30s")

    product_sync_task = asyncio.create_task(_periodic_product_sync())

    # Dọn checkpoint của hội thoại cũ/đã xoá. LangGraph chỉ ghi thêm chứ không tự dọn
    # (đo trên máy chủ: 101 hội thoại đã chiếm 27MB và chỉ có tăng), để lâu thì đầy ổ.
    # Chạy sau 5 phút cho service ổn định rồi lặp mỗi ngày; chạy trong luồng riêng vì
    # sqlite VACUUM là thao tác chặn.
    async def _periodic_checkpoint_gc() -> None:
        from app.services.checkpoint_gc import collect_garbage

        await asyncio.sleep(300)
        while True:
            try:
                await asyncio.to_thread(
                    collect_garbage, settings.checkpoint_db_path, settings.chat_db_path
                )
            except Exception:  # noqa: BLE001 — dọn dẹp lỗi không được giết service
                logger.exception("Dọn checkpoint thất bại — thử lại ngày mai")
            await asyncio.sleep(86_400)

    checkpoint_gc_task = asyncio.create_task(_periodic_checkpoint_gc())

    db = Database(settings.chat_db_path)
    await db.connect()

    # MCP session manager phải được host lifespan khởi động (mount bỏ qua lifespan con).
    # Chạy trong task riêng: anyio task group của nó yêu cầu vào/ra cancel scope cùng 1 task
    # (uvicorn thỏa mãn, nhưng pytest-asyncio teardown ở task khác → phải cô lập như dưới).
    mcp_server = getattr(app.state, "mcp", None)
    mcp_task: asyncio.Task | None = None
    mcp_stop = asyncio.Event()
    if mcp_server is not None:
        mcp_started = asyncio.Event()

        async def _run_mcp() -> None:
            async with mcp_server.session_manager.run():
                mcp_started.set()
                await mcp_stop.wait()

        mcp_task = asyncio.create_task(_run_mcp())
        await mcp_started.wait()

    async with AsyncSqliteSaver.from_conn_string(settings.checkpoint_db_path) as checkpointer:
        conversation_repo = ConversationRepo(db)
        message_repo = MessageRepo(db)
        memory_repo = MemoryRepo(db)

        # Tool MCP do admin cấu hình ở /admin (best-effort: server chết thì bỏ qua)
        mcp_tools: list = []
        if settings.use_deep_agent:
            from app.deep import mcp_store

            mcp_tools = await mcp_store.load_tools()
            if mcp_tools:
                logger.info("Đã nạp %d tool từ MCP server của admin", len(mcp_tools))

        builder = ChatGraphBuilder(settings, extra_tools=mcp_tools)
        graph = builder.compile(checkpointer)

        memory_service = MemoryService(
            settings=settings,
            llm=builder.llm,  # LLM không bind tools cho tóm tắt/title/facts
            conversation_repo=conversation_repo,
            message_repo=message_repo,
            summary_memory=SummaryMemory(memory_repo),
            long_term_memory=LongTermMemory(memory_repo),
        )
        chat_service = ChatService(
            settings=settings,
            graph=graph,
            conversation_repo=conversation_repo,
            message_repo=message_repo,
            memory_repo=memory_repo,
            memory_service=memory_service,
            llm=builder.llm,  # dùng cho vision (image search)
        )

        # AG-UI (chuẩn Agent-User Interaction) cho CopilotKit — chạy SONG SONG với
        # /api/chat, không thay thế. Gắn ở đây vì cần graph đã compile với checkpointer.
        if settings.use_deep_agent:
            from app.api.agui import mount_agui
            from app.deep.admin_agent import get_admin_agent

            # Trợ lý admin cũng nói AG-UI để trang quản trị dùng được CopilotKit.
            # Dựng ở đây (thay vì lần gọi đầu) để lỗi cấu hình lộ ra lúc khởi động.
            try:
                admin_agent = get_admin_agent()
            except Exception:  # noqa: BLE001 — thiếu key/cấu hình không được chặn chat khách
                logger.exception("Không dựng được trợ lý admin → bỏ qua AG-UI admin")
                admin_agent = None
            app.state.agui_paths = mount_agui(app, chat_graph=graph, admin_graph=admin_agent)

        app.state.settings = settings
        app.state.db = db
        app.state.checkpointer = checkpointer
        app.state.conversation_repo = conversation_repo
        app.state.message_repo = message_repo
        app.state.memory_repo = memory_repo
        app.state.chat_service = chat_service

        try:
            yield
        finally:
            await chat_service.wait_background()

    product_sync_task.cancel()
    checkpoint_gc_task.cancel()

    if mcp_task is not None:
        mcp_stop.set()
        await mcp_task

    await db.close()


def create_app() -> FastAPI:
    settings = get_settings()
    tracing_on = configure_tracing(settings)  # bật LangSmith qua os.environ nếu LANGSMITH_TRACING=true
    if tracing_on:
        logging.getLogger("app").info(
            "LangSmith tracing BẬT → project=%s", settings.langsmith_project
        )
    else:
        logging.getLogger("app").info("LangSmith tracing TẮT (thiếu key hoặc LANGSMITH_TRACING=false)")

    app = FastAPI(title="VHD Corp AI Agent", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_api.router)
    app.include_router(chat_api.router)
    app.include_router(conversations_api.router)
    app.include_router(tts_api.router)
    app.include_router(a2a_api.router)
    app.include_router(admin_api.router)
    app.include_router(admin_ai_api.router)
    app.include_router(admin_deep_api.router)

    # MCP streamable-http tại /mcp (instance riêng mỗi app; lifespan chạy session_manager)
    mcp_server = build_mcp()
    app.state.mcp = mcp_server
    app.mount("/mcp", mcp_server.streamable_http_app())

    return app


app = create_app()
