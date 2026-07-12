"""Knowledge base (data/knowledge.md): nạp, tra cứu section, tool search_knowledge."""

from app.services.knowledge import get_context_text, load_knowledge, search_knowledge_text
from app.tools.knowledge import search_knowledge


def setup_module():
    load_knowledge(force=True)


def test_load_knowledge_has_headings():
    text = load_knowledge()
    assert "## Giờ mở cửa" in text
    assert "## Chính sách đổi trả & bảo hành" in text


def test_context_text_strips_html_comment():
    text = get_context_text()
    assert "Khách điền" not in text  # comment hướng dẫn đã bị loại khỏi context


def test_search_knowledge_hours():
    result = search_knowledge_text("giờ mở cửa")
    assert "8:00" in result
    assert "17:30" in result


def test_search_knowledge_warranty():
    result = search_knowledge_text("chính sách bảo hành")
    assert "bảo hành" in result.lower()


def test_search_knowledge_tool_hours():
    result = search_knowledge.invoke({"query": "cửa hàng mở cửa lúc mấy giờ"})
    assert "8:00" in result
    assert "17:30" in result


def test_search_knowledge_no_match():
    result = search_knowledge.invoke({"query": "xyzzyqwerty flibbertigibbet"})
    assert "Chưa có thông tin" in result
