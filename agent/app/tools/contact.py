"""Tool send_contact_request: gửi yêu cầu liên hệ của khách tới BE (POST /api/contact)."""

import logging

import httpx
from langchain_core.tools import tool

from app.core.config import get_settings
from app.tools.base import catch_tool_errors

logger = logging.getLogger(__name__)


@tool
@catch_tool_errors
async def send_contact_request(
    name: str,
    email: str,
    message: str,
    phone: str = "",
    subject: str = "",
) -> str:
    """Gửi yêu cầu liên hệ/báo giá của khách hàng tới đội ngũ VHD Corp.
    CHỈ gọi khi khách đã đồng ý và đã cung cấp đủ: tên (name), email và nội dung (message).
    LƯU Ý: phone (số điện thoại) là BẮT BUỘC — nếu khách chưa cho, hãy hỏi xin SĐT
    trước khi gọi tool. subject là tùy chọn. Sau khi gửi thành công, xác nhận lại với khách."""
    settings = get_settings()
    payload: dict = {
        "name": name.strip()[:100],
        "email": email.strip(),
        "message": message.strip()[:2000],
    }
    if phone and phone.strip():
        payload["phone"] = phone.strip()[:20]
    if subject and subject.strip():
        payload["subject"] = subject.strip()[:200]

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(f"{settings.be_api_url}/contact", json=payload)

    if resp.status_code < 300:
        logger.info("Đã gửi contact cho %s <%s>", name, email)
        return (
            f"Đã gửi yêu cầu liên hệ thành công cho {name} ({email}). "
            "Đội ngũ VHD Corp sẽ phản hồi qua email sớm nhất."
        )
    return f"Gửi liên hệ thất bại (HTTP {resp.status_code}): {resp.text[:200]}"


@tool
@catch_tool_errors
async def create_quote_request(
    product: str,
    quantity: str,
    name: str,
    email: str,
    phone: str = "",
    note: str = "",
) -> str:
    """Gửi YÊU CẦU BÁO GIÁ của khách tới VHD Corp (dùng khi khách submit form báo giá gen-UI
    hoặc đã cung cấp đủ thông tin báo giá số lượng).
    Bắt buộc: product (sản phẩm), quantity (số lượng), name (tên), email. phone/note tùy chọn."""
    settings = get_settings()
    lines = [
        "[BÁO GIÁ] Yêu cầu báo giá từ khách qua trợ lý AI:",
        f"- Sản phẩm: {product.strip()}",
        f"- Số lượng: {quantity.strip()}",
    ]
    if note and note.strip():
        lines.append(f"- Ghi chú: {note.strip()}")
    payload: dict = {
        "name": name.strip()[:100],
        "email": email.strip(),
        "subject": f"[BÁO GIÁ] {product.strip()[:150]}",
        "message": "\n".join(lines)[:2000],
    }
    if phone and phone.strip():
        payload["phone"] = phone.strip()[:20]

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(f"{settings.be_api_url}/contact", json=payload)

    if resp.status_code < 300:
        logger.info("Đã gửi báo giá cho %s <%s> — %s x%s", name, email, product, quantity)
        return (
            f"Đã gửi yêu cầu báo giá {quantity} {product} cho {name} ({email}). "
            "Đội ngũ VHD Corp sẽ gửi báo giá qua email sớm nhất."
        )
    return f"Gửi báo giá thất bại (HTTP {resp.status_code}): {resp.text[:200]}"
