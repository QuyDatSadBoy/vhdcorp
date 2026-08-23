"""Bóc chữ từ tệp khách gửi: PDF, Excel, Word, văn bản thuần.

Khách hỏi hàng hay gửi kèm bảng chào giá, bản vẽ có ghi chú, danh sách vật tư. Không
đọc được thì trợ lý phải bảo khách gõ lại — mất khách ngay ở bước đó.

Nguyên tắc chung cho mọi định dạng:
- Giới hạn kích thước ĐẦU VÀO và số chữ ĐẦU RA. Một bảng Excel vài vạn dòng nhét
  thẳng vào ngữ cảnh thì vừa tốn tiền vừa làm mô hình lạc trọng tâm.
- Không bao giờ ném lỗi ra ngoài: tệp hỏng thì báo bằng câu tiếng Việt để trợ lý nói
  lại với khách, chứ không làm hỏng cả lượt chat.
"""

from __future__ import annotations

import csv
import io
import logging

logger = logging.getLogger(__name__)

MAX_BYTES = 10 * 1024 * 1024   # 10MB — đủ cho hồ sơ chào giá thông thường
MAX_CHARS = 12_000             # phần đưa cho mô hình
MAX_PDF_PAGES = 30
MAX_SHEET_ROWS = 300

SUPPORTED = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xlsx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "text",
    "text/csv": "csv",
    "text/markdown": "text",
    "application/json": "text",
}

# Khớp theo đuôi tệp khi trình duyệt không đoán được kiểu (hay gặp với .docx cũ)
_BY_EXT = {
    ".pdf": "pdf", ".xlsx": "xlsx", ".xls": "xlsx", ".docx": "docx",
    ".txt": "text", ".md": "text", ".json": "text", ".csv": "csv",
}


def kind_of(filename: str, content_type: str | None) -> str | None:
    """Loại tệp để chọn cách bóc; None nghĩa là không hỗ trợ."""
    if content_type and content_type.split(";")[0].strip() in SUPPORTED:
        return SUPPORTED[content_type.split(";")[0].strip()]
    name = (filename or "").lower()
    for ext, kind in _BY_EXT.items():
        if name.endswith(ext):
            return kind
    return None


def _clip(text: str) -> str:
    text = text.strip()
    if len(text) <= MAX_CHARS:
        return text
    return text[:MAX_CHARS] + f"\n…(còn nữa, đã cắt ở {MAX_CHARS} ký tự)"


def _from_pdf(data: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    pages = reader.pages[:MAX_PDF_PAGES]
    out = []
    for i, page in enumerate(pages, 1):
        try:
            body = (page.extract_text() or "").strip()
        except Exception:  # noqa: BLE001 — một trang hỏng không được làm hỏng cả tệp
            body = ""
        if body:
            out.append(f"--- Trang {i} ---\n{body}")
    if not out:
        # PDF quét từ máy scan chỉ có ảnh; nói thẳng thay vì trả chuỗi rỗng khó hiểu
        return "(Tệp PDF này không có chữ đọc được — có thể là bản scan chụp ảnh.)"
    if len(reader.pages) > MAX_PDF_PAGES:
        out.append(f"…(tệp có {len(reader.pages)} trang, chỉ đọc {MAX_PDF_PAGES} trang đầu)")
    return "\n\n".join(out)


def _from_xlsx(data: bytes) -> str:
    from openpyxl import load_workbook

    wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    out = []
    for ws in wb.worksheets:
        rows = []
        for r, row in enumerate(ws.iter_rows(values_only=True)):
            if r >= MAX_SHEET_ROWS:
                rows.append(f"…(còn dòng nữa, chỉ đọc {MAX_SHEET_ROWS} dòng đầu)")
                break
            cells = ["" if c is None else str(c).strip() for c in row]
            if any(cells):
                rows.append(" | ".join(cells))
        if rows:
            out.append(f"--- Sheet: {ws.title} ---\n" + "\n".join(rows))
    wb.close()
    return "\n\n".join(out) or "(Bảng tính không có dữ liệu.)"


def _from_docx(data: bytes) -> str:
    import docx

    doc = docx.Document(io.BytesIO(data))
    parts = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    for table in doc.tables:  # bảng trong Word hay chứa đúng phần quy cách cần đọc
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells]
            if any(cells):
                parts.append(" | ".join(cells))
    return "\n".join(parts) or "(Tài liệu không có chữ nào.)"


def _from_csv(data: bytes) -> str:
    text = data.decode("utf-8", errors="replace")
    rows = []
    for r, row in enumerate(csv.reader(io.StringIO(text))):
        if r >= MAX_SHEET_ROWS:
            rows.append(f"…(còn dòng nữa, chỉ đọc {MAX_SHEET_ROWS} dòng đầu)")
            break
        if any(str(c).strip() for c in row):
            rows.append(" | ".join(str(c).strip() for c in row))
    return "\n".join(rows) or "(Tệp CSV rỗng.)"


def extract(filename: str, content_type: str | None, data: bytes) -> tuple[bool, str]:
    """Bóc chữ. Trả (đọc được?, nội dung hoặc lời giải thích cho khách)."""
    if not data:
        return False, "Tệp rỗng."
    if len(data) > MAX_BYTES:
        return False, f"Tệp nặng quá ({len(data) // 1024 // 1024}MB) — mình chỉ đọc được tối đa 10MB."

    kind = kind_of(filename, content_type)
    if kind is None:
        return False, "Mình đọc được PDF, Excel, Word, CSV và tệp văn bản. Tệp này chưa hỗ trợ."

    try:
        if kind == "pdf":
            text = _from_pdf(data)
        elif kind == "xlsx":
            text = _from_xlsx(data)
        elif kind == "docx":
            text = _from_docx(data)
        elif kind == "csv":
            text = _from_csv(data)
        else:
            text = data.decode("utf-8", errors="replace")
    except Exception:  # noqa: BLE001 — tệp hỏng là chuyện thường, không được làm sập chat
        logger.exception("Không bóc được nội dung tệp %s", filename)
        return False, "Mình mở tệp này không được — có thể tệp hỏng hoặc đặt mật khẩu."

    return True, _clip(text)
