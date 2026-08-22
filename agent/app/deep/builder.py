"""Dựng DeepAgents làm LÕI agent (thay vòng lặp agent⇄tools tự viết).

Được gì so với lõi cũ:
- `write_todos`: model tự lập kế hoạch nhiều bước → FE hiện bảng việc cần làm.
- `task`: giao việc cho subagent (context riêng) khi câu hỏi nặng, không làm bẩn hội thoại.
- SKILL: admin thêm quy trình nghiệp vụ (báo giá sỉ, tra cứu quy cách…) dạng SKILL.md,
  nạp theo kiểu progressive disclosure nên thêm nhiều cũng không phình context.
- Tool MCP do admin cấu hình được nạp thêm vào cùng bộ tool VHD.

Guardrail / cache / memory / gen-UI vẫn nằm ngoài (ở graph + chat_service) — DeepAgents
chỉ thay đúng phần "suy nghĩ và gọi tool".
"""

from __future__ import annotations

import logging

from deepagents import FilesystemMiddleware, create_deep_agent
from langchain.agents.middleware import TodoListMiddleware

logger = logging.getLogger(__name__)

# Tool hệ thống của DeepAgents mà chat KHÁCH được phép dùng: CHỈ ĐỌC.
# Bỏ write_file/edit_file/delete/execute — khách không có lý do gì ghi file hay chạy lệnh,
# và loại hẳn thì prompt-injection cũng không có tool nào để lợi dụng.
_READONLY_FS_TOOLS = ["read_file", "ls", "glob", "grep"]

# Nhắc việc bằng tiếng Việt, đúng ngữ cảnh bán hàng (mặc định của thư viện là tiếng Anh,
# dài và hướng về lập trình → model dễ lập kế hoạch cho câu chào hỏi tầm thường).
_TODO_PROMPT = """## Lập kế hoạch (`write_todos`)

Bạn có tool `write_todos` để lập danh sách việc cần làm.

CHỈ dùng khi yêu cầu của khách thực sự nhiều bước (từ 3 bước trở lên), ví dụ: so sánh
nhiều sản phẩm rồi báo giá theo số lượng rồi lập yêu cầu báo giá. Với câu hỏi thường
(chào hỏi, hỏi 1 sản phẩm, hỏi giờ mở cửa) thì TUYỆT ĐỐI không dùng — trả lời trực tiếp.

Khi dùng: đánh dấu `in_progress` cho việc đang làm, xong việc nào đánh `completed` ngay
(không dồn), và câu trả lời cuối cho khách phải nằm ở tin nhắn SAU lần gọi `write_todos`
cuối cùng."""


def build_deep_agent(llm, tools: list, system_prompt: str = ""):
    """Dựng 1 deep agent cho 1 model cụ thể (chưa bind tools — DeepAgents tự bind)."""
    return create_deep_agent(
        model=llm,
        tools=tools,
        system_prompt=system_prompt or None,
        middleware=[
            # Allowlist read-only (cách này chắc chắn ăn; HarnessProfile phải khớp
            # provider:model nên dễ trượt khi ta đổi model).
            FilesystemMiddleware(tools=_READONLY_FS_TOOLS),
            TodoListMiddleware(system_prompt=_TODO_PROMPT),
        ],
        skills=["/skills/"],
    )


def build_deep_agent_chain(llms: list, tools: list, system_prompt: str = "", max_agents: int = 6):
    """Chuỗi deep agent dự phòng: model đầu lỗi → chạy lại bằng model kế tiếp.

    Fallback đặt ở tầng AGENT (compiled graph là Runnable nên `.with_fallbacks` dùng được),
    vì `create_deep_agent` cần một BaseChatModel thật để bind tool — không nhận được
    RunnableWithFallbacks như chuỗi cũ. Giới hạn `max_agents` vì mỗi agent là 1 graph
    biên dịch riêng, dựng cả 14 model là thừa (2 nhà cung cấp đầu đã đủ che quota).
    """
    chosen = [m for m in llms if m is not None][:max_agents]
    if not chosen:
        raise ValueError("Không có model nào để dựng deep agent")
    agents = [build_deep_agent(m, tools, system_prompt) for m in chosen]
    logger.info("DeepAgents: %d agent trong chuỗi dự phòng", len(agents))
    return agents[0].with_fallbacks(agents[1:]) if len(agents) > 1 else agents[0]
