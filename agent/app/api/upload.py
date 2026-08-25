"""POST /api/upload — khách gửi tệp, trả về phần chữ đã bóc để đính vào câu hỏi.

Không lưu tệp lại: bóc chữ xong là bỏ. Giữ tệp của khách trên máy chủ vừa tốn chỗ vừa
thành trách nhiệm bảo quản dữ liệu người khác mà chẳng đổi lấy lợi ích gì — phần chữ
đi kèm câu hỏi là đủ để trợ lý trả lời.
"""

import logging

from fastapi import APIRouter, File, Request, UploadFile

from app.core import rate_limit
from app.services import documents

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/api/upload")
async def upload(request: Request, file: UploadFile = File(...)):
    # Cùng hàng rào chống spam như chat: bóc tệp cũng tốn CPU, và tệp lớn thì tốn nhiều.
    ip = rate_limit.client_ip(request)
    allowed, reason = rate_limit.check(ip)
    if not allowed:
        rate_limit.note_blocked(ip)
        return {"ok": False, "error": reason}

    data = await file.read(documents.MAX_BYTES + 1)
    ok, text = documents.extract(file.filename or "tệp", file.content_type, data)
    if not ok:
        return {"ok": False, "error": text}

    rate_limit.record(ip)
    return {
        "ok": True,
        "filename": file.filename or "tệp",
        "chars": len(text),
        "text": text,
    }
