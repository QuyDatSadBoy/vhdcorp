"""Gmail IMAP reader: parse thư (mock imaplib) + lỗi login + tích hợp thật (skip nếu offline)."""

import imaplib

import pytest

from app.services import gmail_reader
from app.services.gmail_reader import GmailReader, GmailReaderError, list_recent_emails

RAW_EMAIL = (
    b"From: Nguyen Van A <a@example.com>\r\n"
    b"Subject: =?UTF-8?B?VGh1IHRlc3Q=?=\r\n"  # base64("Thu test")
    b"Date: Mon, 07 Jul 2026 10:00:00 +0700\r\n"
    b"Content-Type: text/plain; charset=utf-8\r\n"
    b"\r\n"
    b"Xin chao, day la noi dung email test.\r\n"
)


class FakeIMAP:
    """Giả lập imaplib.IMAP4_SSL — 2 thư: id 2 đã đọc (\\Seen), id 1 chưa đọc."""

    def __init__(self, host, port):
        self.host = host
        self.port = port

    def login(self, user, password):
        return ("OK", [b"Logged in"])

    def select(self, mailbox, readonly=False):
        return ("OK", [b"2"])

    def search(self, charset, criteria):
        return ("OK", [b"1 2"])

    def fetch(self, msg_id, spec):
        flags = b"\\Seen" if msg_id == b"2" else b""
        meta = b"%s (FLAGS (%s) BODY[] {123}" % (msg_id, flags)
        return ("OK", [(meta, RAW_EMAIL), b")"])

    def close(self):
        pass

    def logout(self):
        pass


class FailLoginIMAP(FakeIMAP):
    def login(self, user, password):
        raise imaplib.IMAP4.error("AUTHENTICATIONFAILED")


def test_gmail_reader_parses(monkeypatch):
    monkeypatch.setattr(imaplib, "IMAP4_SSL", FakeIMAP)
    with GmailReader("imap.gmail.com", "u", "p") as reader:
        emails = reader.list_recent(limit=10)

    assert len(emails) == 2
    # Mới nhất trước (id 2), đã đọc
    assert emails[0]["subject"] == "Thu test"
    assert emails[0]["from"] == "Nguyen Van A <a@example.com>"
    assert emails[0]["unread"] is False
    assert "noi dung email test" in emails[0]["snippet"]
    assert len(emails[0]["snippet"]) <= 200
    # id 1 chưa đọc
    assert emails[1]["unread"] is True


def test_gmail_reader_login_error(monkeypatch):
    monkeypatch.setattr(imaplib, "IMAP4_SSL", FailLoginIMAP)
    with pytest.raises(GmailReaderError):
        with GmailReader("imap.gmail.com", "u", "p") as reader:
            reader.list_recent()


def test_gmail_reader_missing_config(monkeypatch):
    from app.core import config

    monkeypatch.setattr(gmail_reader, "get_settings", lambda: config.Settings(
        gmail_imap_user="", gmail_imap_password=""
    ))
    with pytest.raises(GmailReaderError):
        list_recent_emails(limit=1)


@pytest.mark.integration
def test_gmail_real_connection():
    """Kết nối thật tới Gmail — skip nếu chưa cấu hình hoặc không kết nối được."""
    from app.core.config import get_settings

    settings = get_settings()
    if not settings.gmail_imap_user or not settings.gmail_imap_password:
        pytest.skip("Chưa cấu hình GMAIL_IMAP_USER/PASSWORD")
    try:
        emails = list_recent_emails(limit=2)
    except GmailReaderError as exc:
        pytest.skip(f"Không kết nối được Gmail (có thể IMAP chưa bật): {exc}")
    assert isinstance(emails, list)
