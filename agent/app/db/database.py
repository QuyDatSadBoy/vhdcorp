"""Kết nối aiosqlite + schema cho chat.db (conversations, messages, memory)."""

from pathlib import Path

import aiosqlite

SCHEMA = """
CREATE TABLE IF NOT EXISTS conversations (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);

CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    ui_blocks       TEXT NOT NULL DEFAULT '[]',
    created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

CREATE TABLE IF NOT EXISTS memory (
    conversation_id TEXT PRIMARY KEY,
    summary         TEXT NOT NULL DEFAULT '',
    facts_json      TEXT NOT NULL DEFAULT '[]',
    updated_at      TEXT NOT NULL
);
"""


class Database:
    """Quản lý một kết nối aiosqlite dùng chung (aiosqlite tự tuần tự hóa truy vấn)."""

    def __init__(self, path: str) -> None:
        self.path = path
        self.conn: aiosqlite.Connection | None = None

    async def connect(self) -> None:
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = await aiosqlite.connect(self.path)
        self.conn.row_factory = aiosqlite.Row
        await self.conn.executescript(SCHEMA)
        # Migration nhẹ: DB cũ chưa có cột ui_blocks (gen-UI persist)
        cur = await self.conn.execute("PRAGMA table_info(messages)")
        cols = {r["name"] for r in await cur.fetchall()}
        if "ui_blocks" not in cols:
            await self.conn.execute("ALTER TABLE messages ADD COLUMN ui_blocks TEXT NOT NULL DEFAULT '[]'")
        await self.conn.commit()

    async def close(self) -> None:
        if self.conn is not None:
            await self.conn.close()
            self.conn = None
