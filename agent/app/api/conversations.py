"""CRUD hội thoại: list / messages / rename / delete (lọc theo X-Chat-User)."""

import logging

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/conversations")


class RenameRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)


@router.get("")
async def list_conversations(
    request: Request, x_chat_user: str = Header(..., alias="X-Chat-User")
):
    conversations = await request.app.state.conversation_repo.list(x_chat_user)
    return {"conversations": conversations}


@router.get("/{conversation_id}/messages")
async def list_messages(
    conversation_id: str,
    request: Request,
    x_chat_user: str = Header(..., alias="X-Chat-User"),
):
    conv = await request.app.state.conversation_repo.get(conversation_id, x_chat_user)
    if conv is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy hội thoại.")
    messages = await request.app.state.message_repo.list(conversation_id)
    return {"conversation": conv, "messages": messages}


@router.patch("/{conversation_id}")
async def rename_conversation(
    conversation_id: str,
    body: RenameRequest,
    request: Request,
    x_chat_user: str = Header(..., alias="X-Chat-User"),
):
    renamed = await request.app.state.conversation_repo.rename(
        conversation_id, x_chat_user, body.title.strip()
    )
    if not renamed:
        raise HTTPException(status_code=404, detail="Không tìm thấy hội thoại.")
    return {"id": conversation_id, "title": body.title.strip()}


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    request: Request,
    x_chat_user: str = Header(..., alias="X-Chat-User"),
):
    state = request.app.state
    deleted = await state.conversation_repo.delete(conversation_id, x_chat_user)
    if not deleted:
        raise HTTPException(status_code=404, detail="Không tìm thấy hội thoại.")
    await state.message_repo.delete_for(conversation_id)
    await state.memory_repo.delete(conversation_id)
    try:
        await state.checkpointer.adelete_thread(conversation_id)
    except Exception:  # noqa: BLE001 — checkpoint xóa lỗi không chặn response
        logger.exception("Không xóa được checkpoint thread %s", conversation_id)
    return {"deleted": True, "id": conversation_id}
