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
from langchain.agents.middleware import (
    ModelCallLimitMiddleware,
    ModelFallbackMiddleware,
    TodoListMiddleware,
    ToolCallLimitMiddleware,
)

logger = logging.getLogger(__name__)

# Tool hệ thống của DeepAgents mà chat KHÁCH được phép dùng: CHỈ ĐỌC.
# Bỏ write_file/edit_file/delete/execute — khách không có lý do gì ghi file hay chạy lệnh,
# và loại hẳn thì prompt-injection cũng không có tool nào để lợi dụng.
_READONLY_FS_TOOLS = ["read_file", "ls", "glob", "grep"]

# Ở chế độ MỞ RỘNG, trợ lý được soạn và sửa tài liệu cho khách (bảng tính nháp, thư
# chào hàng, danh sách quy cách). An toàn vì các tool này của DeepAgents ghi vào bộ
# nhớ của LƯỢT CHAT, không đụng đĩa máy chủ — kiểm chứng: FilesystemMiddleware mặc
# định lưu ở state["files"], không hề gọi open() hay ghi ra đường dẫn nào.
# Vẫn KHÔNG mở execute/shell ở bất kỳ chế độ nào: chạy lệnh trên máy chủ là chuyện khác hẳn.
_WRITABLE_FS_TOOLS = [*_READONLY_FS_TOOLS, "write_file", "edit_file"]


def _fs_tools_for_mode() -> list[str]:
    """Bộ tool tài liệu theo phạm vi admin đặt."""
    try:
        from app.deep.agent_mode import get_mode

        return _WRITABLE_FS_TOOLS if get_mode() == "mo_rong" else _READONLY_FS_TOOLS
    except Exception:  # noqa: BLE001 — không đọc được cấu hình thì chọn bên chặt hơn
        return _READONLY_FS_TOOLS

# ── Chốt an toàn chi phí/tốc độ ──────────────────────────────────────────────
# Đo thật: khi catalog không có món khách hỏi, model tra `search_products` tới 20 lần
# với 20 câu truy vấn khác nhau (mỗi lần là 1 vòng gọi model → chậm và tốn tiền).
# Chặn ở mức đủ dùng: tra vài lần không thấy thì phải nói thẳng là chưa có.
_SEARCH_RUN_LIMIT = 5      # số lần tra cứu sản phẩm trong MỘT lượt trả lời
_TOOL_RUN_LIMIT = 15       # tổng số lần gọi tool trong một lượt
_MODEL_RUN_LIMIT = 12      # tổng số vòng gọi model trong một lượt

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

# Nhắc thêm về tra cứu: tránh vòng lặp tra vô ích (giới hạn cứng ở middleware chỉ là
# lưới an toàn — nói rõ trong prompt thì model dừng đúng lúc và trả lời tử tế hơn).
_SEARCH_DISCIPLINE = f"""## Kỷ luật tra cứu

Mỗi lượt trả lời chỉ tra cứu sản phẩm tối đa {_SEARCH_RUN_LIMIT} lần. Nếu đã thử 2 cách
gọi tên mà kho không có món khách hỏi thì DỪNG tra, nói thẳng "kho mình chưa có món này"
rồi gợi ý món gần nhất hoặc mời khách để lại liên hệ — TUYỆT ĐỐI không thử thêm hàng loạt
từ khoá khác nhau."""


# ── Subagent: việc nặng chạy trong context RIÊNG rồi trả về 1 bản tóm tắt ──────
# Lợi ích thật: so sánh 4-5 sản phẩm cần tra rất nhiều lần; nếu chạy trong hội thoại
# chính thì toàn bộ dữ liệu thô đó nằm lại trong context và những lượt sau phải trả tiền
# cho nó mãi. Giao cho subagent thì hội thoại chính chỉ nhận phần kết luận.
def _subagents(tools: list) -> list[dict]:
    by_name = {getattr(t, "name", ""): t for t in tools}

    def pick(*wanted: str) -> list:
        """Lấy đúng ĐỐI TƯỢNG tool theo tên (subagent cần tool thật, không phải tên)."""
        return [by_name[n] for n in wanted if n in by_name]

    return [
        {
            "name": "tra-cuu-san-pham",
            "description": (
                "Dùng khi cần tra cứu / so sánh NHIỀU sản phẩm (từ 3 mặt hàng trở lên) hoặc "
                "phải thử nhiều quy cách. Trả về bảng tóm tắt gọn: tên, giá, tồn, quy cách nổi bật."
            ),
            "system_prompt": (
                "Bạn tra cứu catalog VHD Corp. Dùng search_products / get_product_detail để lấy dữ "
                "liệu THẬT. Trả về bản tóm tắt ngắn gọn dạng danh sách: tên sản phẩm, giá (hoặc "
                "'liên hệ báo giá'), tồn kho, quy cách/chất liệu đáng chú ý. TUYỆT ĐỐI không bịa "
                "thông số. Tra tối đa 5 lần; không thấy thì ghi rõ 'kho không có'. Không chào hỏi, "
                "không kết luận bán hàng — chỉ dữ liệu."
            ),
            "tools": pick("search_products", "get_product_detail", "list_categories", "get_recommendations"),
        },
        {
            "name": "tra-cuu-tai-lieu",
            "description": (
                "Dùng khi câu hỏi về chính sách/dịch vụ công ty cần đối chiếu nhiều mục tài liệu "
                "(vd vừa giao hàng vừa đổi trả vừa hoá đơn VAT)."
            ),
            "system_prompt": (
                "Bạn tra tài liệu nội bộ VHD Corp bằng search_knowledge. Trả lời bằng đúng nội dung "
                "tài liệu, trích gọn từng mục. Tài liệu không có thì ghi rõ 'tài liệu chưa có mục "
                "này'. TUYỆT ĐỐI không suy diễn thêm."
            ),
            "tools": pick("search_knowledge", "get_company_info", "search_posts"),
        },
    ]


def _middleware(fallback_models: list):
    """Bộ middleware: tool chỉ-đọc → lập kế hoạch → chốt giới hạn → dự phòng model."""
    stack = [
        FilesystemMiddleware(tools=_fs_tools_for_mode()),
        TodoListMiddleware(system_prompt=_TODO_PROMPT),
        # 'continue' = chặn riêng tool vượt hạn nhưng vẫn để agent trả lời bằng dữ liệu
        # đã có. Khách luôn nhận được câu trả lời, thay vì thấy lỗi.
        ToolCallLimitMiddleware(
            tool_name="search_products", run_limit=_SEARCH_RUN_LIMIT, exit_behavior="continue"
        ),
        ToolCallLimitMiddleware(run_limit=_TOOL_RUN_LIMIT, exit_behavior="continue"),
        ModelCallLimitMiddleware(run_limit=_MODEL_RUN_LIMIT, exit_behavior="end"),
    ]
    if fallback_models:
        # Dự phòng ở tầng LỜI GỌI MODEL: model chính lỗi/hết quota thì chỉ gọi lại đúng
        # lượt đó bằng model kế tiếp — không phải chạy lại toàn bộ lượt như khi bọc
        # fallback quanh cả graph (tránh trả lại token đã stream cho khách).
        stack.append(ModelFallbackMiddleware(*fallback_models))

    # AG-UI / CopilotKit: đưa `todos` ra ngoài dưới dạng state của agent và stream dần
    # từng việc NGAY TRONG LÚC model còn đang sinh tham số `write_todos` (thay vì chờ
    # gọi xong mới hiện cả bảng). Không cài được 2 gói này thì bỏ qua — chat SSE hiện
    # tại không phụ thuộc chúng.
    try:
        from ag_ui_langgraph.middlewares.state_streaming import StateItem, StateStreamingMiddleware
        from copilotkit import CopilotKitMiddleware

        stack.append(CopilotKitMiddleware(expose_state=["todos"]))
        stack.append(
            StateStreamingMiddleware(
                StateItem(state_key="todos", tool="write_todos", tool_argument="todos")
            )
        )
    except ImportError:
        logger.info("Chưa cài ag-ui-langgraph/copilotkit → bỏ qua middleware AG-UI")
    return stack


# Agent đã dựng, khoá theo phạm vi đang đặt. Đổi phạm vi thì bộ tool tài liệu đổi
# theo, mà agent chỉ dựng một lần lúc khởi động — không nhớ theo phạm vi thì admin bật
# "mở rộng" xong trợ lý vẫn không soạn được tài liệu cho tới lần khởi động sau.
_agent_cache: dict[str, object] = {}


def build_deep_agent_for_mode(llms: list, tools: list, system_prompt: str = "", max_models: int = 6):
    """Lấy agent ứng với phạm vi hiện tại, dựng mới nếu chưa có."""
    key = _fs_tools_for_mode()[-1]  # 'grep' (chỉ đọc) hay 'edit_file' (mở rộng)
    cached = _agent_cache.get(key)
    if cached is None:
        cached = build_deep_agent(llms, tools, system_prompt, max_models)
        _agent_cache[key] = cached
    return cached


def build_deep_agent(llms: list, tools: list, system_prompt: str = "", max_models: int = 6):
    """Dựng 1 deep agent: model đầu là chính, các model sau làm dự phòng.

    `max_models` giới hạn số model dự phòng đưa vào middleware (2 nhà cung cấp đầu đã
    đủ che trường hợp hết quota; kéo cả 14 model vào chỉ làm prompt/log dài thêm).
    """
    chosen = [m for m in llms if m is not None][:max_models]
    if not chosen:
        raise ValueError("Không có model nào để dựng deep agent")
    primary, fallbacks = chosen[0], chosen[1:]
    logger.info("DeepAgents: 1 agent, model chính + %d model dự phòng", len(fallbacks))
    return create_deep_agent(
        model=primary,
        tools=tools,
        system_prompt=(system_prompt + "\n\n" + _SEARCH_DISCIPLINE).strip(),
        middleware=_middleware(fallbacks),
        subagents=_subagents(tools),
        skills=["/skills/"],
    )
