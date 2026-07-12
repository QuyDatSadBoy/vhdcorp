"""Repository cho conversations / messages / memory."""

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from app.db.database import Database


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


class ConversationRepo:
    def __init__(self, db: Database) -> None:
        self.db = db

    async def create(self, user_id: str, title: str) -> dict[str, Any]:
        conn = self.db.conn
        row = {
            "id": _new_id(),
            "user_id": user_id,
            "title": title,
            "created_at": _now(),
            "updated_at": _now(),
        }
        await conn.execute(
            "INSERT INTO conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (row["id"], row["user_id"], row["title"], row["created_at"], row["updated_at"]),
        )
        await conn.commit()
        return row

    async def get(self, conversation_id: str, user_id: str) -> dict[str, Any] | None:
        cur = await self.db.conn.execute(
            "SELECT * FROM conversations WHERE id = ? AND user_id = ?",
            (conversation_id, user_id),
        )
        row = await cur.fetchone()
        return dict(row) if row else None

    async def exists(self, conversation_id: str) -> bool:
        cur = await self.db.conn.execute(
            "SELECT 1 FROM conversations WHERE id = ?", (conversation_id,)
        )
        return await cur.fetchone() is not None

    async def list(self, user_id: str) -> list[dict[str, Any]]:
        cur = await self.db.conn.execute(
            """
            SELECT c.id, c.title, c.created_at, c.updated_at,
                   (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
            FROM conversations c
            WHERE c.user_id = ?
            ORDER BY c.updated_at DESC
            """,
            (user_id,),
        )
        rows = await cur.fetchall()
        return [dict(r) for r in rows]

    async def rename(self, conversation_id: str, user_id: str, title: str) -> bool:
        cur = await self.db.conn.execute(
            "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?",
            (title, _now(), conversation_id, user_id),
        )
        await self.db.conn.commit()
        return cur.rowcount > 0

    async def set_title(self, conversation_id: str, title: str) -> None:
        await self.db.conn.execute(
            "UPDATE conversations SET title = ? WHERE id = ?", (title, conversation_id)
        )
        await self.db.conn.commit()

    async def touch(self, conversation_id: str) -> None:
        await self.db.conn.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ?", (_now(), conversation_id)
        )
        await self.db.conn.commit()

    async def delete(self, conversation_id: str, user_id: str) -> bool:
        cur = await self.db.conn.execute(
            "DELETE FROM conversations WHERE id = ? AND user_id = ?",
            (conversation_id, user_id),
        )
        await self.db.conn.commit()
        return cur.rowcount > 0


class MessageRepo:
    def __init__(self, db: Database) -> None:
        self.db = db

    async def add(
        self, conversation_id: str, role: str, content: str, ui_blocks: list | None = None
    ) -> str:
        message_id = _new_id()
        await self.db.conn.execute(
            "INSERT INTO messages (id, conversation_id, role, content, ui_blocks, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (message_id, conversation_id, role, content, json.dumps(ui_blocks or [], ensure_ascii=False), _now()),
        )
        await self.db.conn.commit()
        return message_id

    async def list(self, conversation_id: str) -> list[dict[str, Any]]:
        cur = await self.db.conn.execute(
            "SELECT id, role, content, ui_blocks, created_at FROM messages"
            " WHERE conversation_id = ? ORDER BY created_at ASC",
            (conversation_id,),
        )
        rows = await cur.fetchall()
        out = []
        for r in rows:
            d = dict(r)
            try:
                d["ui_blocks"] = json.loads(d.get("ui_blocks") or "[]")
            except (TypeError, ValueError):
                d["ui_blocks"] = []
            out.append(d)
        return out

    async def count(self, conversation_id: str) -> int:
        cur = await self.db.conn.execute(
            "SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ?", (conversation_id,)
        )
        row = await cur.fetchone()
        return row["n"]

    async def delete_for(self, conversation_id: str) -> None:
        await self.db.conn.execute(
            "DELETE FROM messages WHERE conversation_id = ?", (conversation_id,)
        )
        await self.db.conn.commit()


class MemoryRepo:
    def __init__(self, db: Database) -> None:
        self.db = db

    async def get(self, conversation_id: str) -> dict[str, Any]:
        cur = await self.db.conn.execute(
            "SELECT summary, facts_json FROM memory WHERE conversation_id = ?",
            (conversation_id,),
        )
        row = await cur.fetchone()
        if not row:
            return {"summary": "", "facts": []}
        try:
            facts = json.loads(row["facts_json"])
        except (json.JSONDecodeError, TypeError):
            facts = []
        return {"summary": row["summary"], "facts": facts}

    async def set_summary(self, conversation_id: str, summary: str) -> None:
        await self.db.conn.execute(
            """
            INSERT INTO memory (conversation_id, summary, facts_json, updated_at)
            VALUES (?, ?, '[]', ?)
            ON CONFLICT(conversation_id) DO UPDATE SET summary = excluded.summary, updated_at = excluded.updated_at
            """,
            (conversation_id, summary, _now()),
        )
        await self.db.conn.commit()

    async def set_facts(self, conversation_id: str, facts: list[str]) -> None:
        await self.db.conn.execute(
            """
            INSERT INTO memory (conversation_id, summary, facts_json, updated_at)
            VALUES (?, '', ?, ?)
            ON CONFLICT(conversation_id) DO UPDATE SET facts_json = excluded.facts_json, updated_at = excluded.updated_at
            """,
            (conversation_id, json.dumps(facts, ensure_ascii=False), _now()),
        )
        await self.db.conn.commit()

    async def delete(self, conversation_id: str) -> None:
        await self.db.conn.execute(
            "DELETE FROM memory WHERE conversation_id = ?", (conversation_id,)
        )
        await self.db.conn.commit()
