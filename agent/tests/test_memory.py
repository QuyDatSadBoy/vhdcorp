from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from app.memory.short_term import ShortTermMemory


def test_trim_keeps_last_n():
    memory = ShortTermMemory(limit=8)
    messages = [HumanMessage(content=f"msg-{i}") for i in range(20)]
    window = memory.trim(messages)
    assert len(window) == 8
    assert window[0].content == "msg-12"
    assert window[-1].content == "msg-19"


def test_trim_short_list_unchanged():
    memory = ShortTermMemory(limit=8)
    messages = [HumanMessage(content="a"), AIMessage(content="b")]
    assert memory.trim(messages) == messages


def test_trim_drops_orphan_tool_message():
    memory = ShortTermMemory(limit=3)
    messages = [
        HumanMessage(content="hỏi giá"),
        AIMessage(content="", tool_calls=[{"name": "search_products", "args": {}, "id": "1"}]),
        ToolMessage(content="kết quả", tool_call_id="1"),
        AIMessage(content="trả lời"),
        HumanMessage(content="hỏi tiếp"),
    ]
    window = memory.trim(messages)
    # Cửa sổ phải bắt đầu bằng HumanMessage (Gemini yêu cầu function-call
    # đứng sau user/function-response) → ToolMessage + AIMessage lẻ bị loại
    assert not isinstance(window[0], ToolMessage)
    assert len(window) == 1


def test_short_term_patches_dangling_tool_call():
    """Tool call dang dở (user Stop giữa chừng) phải được vá bằng ToolMessage tổng hợp."""
    from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

    from app.memory.short_term import ShortTermMemory

    mem = ShortTermMemory(limit=8)
    msgs = [
        HumanMessage(content="tìm giá thị trường"),
        AIMessage(content="", tool_calls=[{"name": "web_search", "args": {"query": "x"}, "id": "call_1"}]),
        # ToolMessage bị thiếu do run bị hủy
        HumanMessage(content="bạn còn đó không?"),
    ]
    window = mem.trim(msgs)
    # Sau AIMessage(tool_calls) phải có ToolMessage vá với đúng tool_call_id
    idx = next(i for i, m in enumerate(window) if isinstance(m, AIMessage) and m.tool_calls)
    assert isinstance(window[idx + 1], ToolMessage)
    assert window[idx + 1].tool_call_id == "call_1"
    # Message người dùng cuối vẫn giữ nguyên ở cuối
    assert window[-1].content == "bạn còn đó không?"


def test_short_term_keeps_complete_tool_pairs():
    from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

    from app.memory.short_term import ShortTermMemory

    mem = ShortTermMemory(limit=8)
    msgs = [
        HumanMessage(content="giá D21?"),
        AIMessage(content="", tool_calls=[{"name": "search_products", "args": {"query": "d21"}, "id": "c1"}]),
        ToolMessage(content="kết quả", tool_call_id="c1"),
        AIMessage(content="25.000đ"),
    ]
    window = mem.trim(msgs)
    assert len(window) == 4  # không chèn thêm gì khi cặp đã đủ
