"""Endpoint AG-UI (chuẩn Agent-User Interaction) cho CopilotKit.

Chạy SONG SONG với `/api/chat` (SSE tự chế) — không thay thế. Lý do giữ cả hai:
- `/api/chat` đang phục vụ widget khách với typewriter, gen-UI, TTS, cache câu lặp…
- `/agui/*` nói đúng chuẩn AG-UI nên CopilotKit (và mọi client AG-UI khác) cắm vào là chạy,
  kèm state `todos` để giao diện vẽ bảng kế hoạch mà không cần thoả thuận riêng.

Khác biệt cần biết khi dùng: AG-UI KHÔNG đi qua cache câu lặp và anti-spam theo IP của
`/api/chat` (hai thứ đó nằm ở tầng API cũ), nên endpoint này chỉ mở cho giao diện admin
đã đăng nhập, không mở cho khách vô danh.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI

logger = logging.getLogger(__name__)

CHAT_PATH = "/agui/chat"
ADMIN_PATH = "/agui/admin"


def mount_agui(app: FastAPI, chat_graph, admin_graph=None) -> list[str]:
    """Gắn endpoint AG-UI vào app. Trả về danh sách path đã gắn (rỗng nếu thiếu thư viện).

    Mỗi request được `LangGraphAgent.clone()` bên trong adapter vì nó giữ trạng thái
    run trong instance — dùng chung một instance cho nhiều request đồng thời sẽ lẫn state.
    """
    try:
        from ag_ui_langgraph import add_langgraph_fastapi_endpoint
        from copilotkit import LangGraphAGUIAgent
    except ImportError:
        logger.info("Chưa cài ag-ui-langgraph/copilotkit → không bật endpoint AG-UI")
        return []

    class _AguiAgent(LangGraphAGUIAgent):
        """Vá lệch phiên bản giữa ag-ui-langgraph 0.0.43 và copilotkit 0.1.95.

        `LangGraphAgent.clone()` dựng lại đối tượng kèm 3 tham số
        (enable_legacy_on_interrupt_event, emit_interrupt_outcome, emit_raw_events) mà
        `LangGraphAGUIAgent.__init__` không nhận → mọi request AG-UI đều 500. Adapter
        clone mỗi request là CÓ CHỦ Ý (nó giữ trạng thái run trong instance), nên không
        thể bỏ clone — chỉ dựng lại bằng đúng 4 tham số mà lớp con chấp nhận.
        """

        def clone(self):
            return _AguiAgent(
                name=self.name,
                graph=self.graph,
                description=self.description,
                config=dict(self.config) if self.config else None,
            )

    mounted: list[str] = []
    targets = [(CHAT_PATH, "vhd_chat", "Trợ lý bán hàng VHD Corp", chat_graph)]
    if admin_graph is not None:
        targets.append((ADMIN_PATH, "vhd_admin", "Trợ lý điều hành admin VHD Corp", admin_graph))

    for path, name, desc, graph in targets:
        if graph is None:
            continue
        try:
            add_langgraph_fastapi_endpoint(
                app=app,
                agent=_AguiAgent(name=name, description=desc, graph=graph),
                path=path,
            )
            mounted.append(path)
        except Exception:  # noqa: BLE001 — AG-UI lỗi không được chặn khởi động service
            logger.exception("Không gắn được endpoint AG-UI tại %s", path)
    if mounted:
        logger.info("AG-UI bật tại: %s", ", ".join(mounted))
    return mounted
