"""Đọc Gmail qua IMAP (stdlib imaplib + email) — chỉ dùng cho endpoint admin.

Dùng IMAPS 993, login bằng App Password, chọn INBOX, fetch N thư mới nhất mà
KHÔNG đánh dấu đã đọc (BODY.PEEK). Đóng kết nối sạch bằng context manager.
Lỗi kết nối/login → raise GmailReaderError (thông điệp rõ, không crash app).
"""

import email
import imaplib
import logging
from email.header import decode_header, make_header
from email.message import Message

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_IMAP_PORT = 993


class GmailReaderError(RuntimeError):
    """Lỗi kết nối/login/đọc Gmail — endpoint bắt để báo rõ cho admin."""


def _decode(value: str | None) -> str:
    """Giải mã MIME-encoded header (vd '=?UTF-8?B?...?=') → chuỗi thường."""
    if not value:
        return ""
    try:
        return str(make_header(decode_header(value)))
    except Exception:  # noqa: BLE001 — header hỏng không được làm gãy cả list
        return value


def _extract_snippet(msg: Message, limit: int = 200) -> str:
    """Lấy đoạn text/plain đầu tiên, gom khoảng trắng, cắt ≤ limit ký tự."""
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain" and not part.get_filename():
                body = _part_text(part)
                if body:
                    break
    else:
        body = _part_text(msg)
    snippet = " ".join(body.split())
    return snippet[:limit]


def _part_text(part: Message) -> str:
    try:
        payload = part.get_payload(decode=True)
        if payload is None:
            return ""
        charset = part.get_content_charset() or "utf-8"
        return payload.decode(charset, errors="replace")
    except Exception:  # noqa: BLE001
        return ""


class GmailReader:
    """Context manager quản lý 1 kết nối IMAPS tới Gmail."""

    def __init__(self, host: str, user: str, password: str) -> None:
        self.host = host
        self.user = user
        self.password = password
        self._imap: imaplib.IMAP4_SSL | None = None

    def __enter__(self) -> "GmailReader":
        try:
            self._imap = imaplib.IMAP4_SSL(self.host, _IMAP_PORT)
            self._imap.login(self.user, self.password)
        except imaplib.IMAP4.error as exc:
            raise GmailReaderError(
                "Đăng nhập IMAP thất bại. Kiểm tra App Password và đảm bảo đã BẬT IMAP "
                f"trong Gmail (Settings → Forwarding and POP/IMAP → Enable IMAP). Chi tiết: {exc}"
            ) from exc
        except OSError as exc:
            raise GmailReaderError(f"Không kết nối được tới {self.host}:{_IMAP_PORT} — {exc}") from exc
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        if self._imap is not None:
            try:
                self._imap.close()
            except Exception:  # noqa: BLE001 — INBOX có thể chưa select
                pass
            try:
                self._imap.logout()
            except Exception:  # noqa: BLE001
                pass
            self._imap = None

    def list_recent(self, limit: int = 10, unread_only: bool = False) -> list[dict]:
        assert self._imap is not None, "GmailReader phải dùng trong 'with'"
        imap = self._imap
        status, _ = imap.select("INBOX", readonly=True)  # readonly: không đổi trạng thái thư
        if status != "OK":
            raise GmailReaderError("Không mở được hộp thư INBOX.")

        criteria = "UNSEEN" if unread_only else "ALL"
        status, data = imap.search(None, criteria)
        if status != "OK":
            raise GmailReaderError("Tìm kiếm thư trong INBOX thất bại.")

        ids = data[0].split()
        recent = ids[-limit:] if limit > 0 else ids
        recent = list(reversed(recent))  # mới nhất trước

        emails: list[dict] = []
        for msg_id in recent:
            # BODY.PEEK: đọc mà KHÔNG đánh dấu \Seen; kèm FLAGS để biết đã đọc chưa
            status, fetched = imap.fetch(msg_id, "(FLAGS BODY.PEEK[])")
            if status != "OK" or not fetched:
                continue
            raw = next(
                (part[1] for part in fetched if isinstance(part, tuple) and part[1]), None
            )
            if raw is None:
                continue
            flags_blob = b" ".join(
                part[0] for part in fetched if isinstance(part, tuple) and part[0]
            )
            unread = b"\\Seen" not in flags_blob

            msg = email.message_from_bytes(raw)
            emails.append(
                {
                    "from": _decode(msg.get("From")),
                    "subject": _decode(msg.get("Subject")),
                    "date": _decode(msg.get("Date")),
                    "snippet": _extract_snippet(msg),
                    "unread": unread,
                }
            )
        return emails


def list_recent_emails(limit: int = 10, unread_only: bool = False) -> list[dict]:
    """Đọc N thư mới nhất từ hộp thư Gmail cấu hình trong env.

    Trả list {from, subject, date, snippet, unread}. Raise GmailReaderError khi lỗi/chưa cấu hình.
    Hàm này BLOCKING (imaplib) → gọi qua run_in_threadpool ở endpoint async.
    """
    settings = get_settings()
    if not settings.gmail_imap_user or not settings.gmail_imap_password:
        raise GmailReaderError("Chưa cấu hình GMAIL_IMAP_USER / GMAIL_IMAP_PASSWORD.")
    with GmailReader(
        settings.gmail_imap_host, settings.gmail_imap_user, settings.gmail_imap_password
    ) as reader:
        return reader.list_recent(limit=limit, unread_only=unread_only)
