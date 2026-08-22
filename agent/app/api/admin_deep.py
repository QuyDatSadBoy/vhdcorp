"""Endpoint admin cấu hình LÕI DeepAgents: SKILL + MCP server.

- GET/POST/DELETE /api/admin/deep/skills : quy trình nghiệp vụ (SKILL.md) cho agent
- GET/POST/DELETE /api/admin/deep/mcp     : MCP server để nạp thêm tool

Skill áp dụng NGAY lượt chat kế tiếp (đọc file mỗi lượt). MCP server nạp lúc khởi động
service nên đổi xong cần restart agent — API trả cờ `restart_required` để FE nói rõ.
Bảo vệ bằng X-Admin-Secret như mọi endpoint admin khác.
"""

import logging

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.core.security import require_admin
from app.deep import mcp_store, skills_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/deep")


class SkillPayload(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field("", max_length=500)
    content: str = Field("", max_length=20_000)
    enabled: bool = True


class McpPayload(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    url: str = Field(min_length=1, max_length=500)
    transport: str = "streamable_http"
    enabled: bool = True


@router.get("/skills")
async def get_skills(x_admin_secret: str = Header(None, alias="X-Admin-Secret")):
    require_admin(x_admin_secret)
    return {"skills": skills_store.list_skills()}


@router.post("/skills")
async def put_skill(payload: SkillPayload, x_admin_secret: str = Header(None, alias="X-Admin-Secret")):
    require_admin(x_admin_secret)
    try:
        skill = skills_store.upsert_skill(
            payload.name, payload.description, payload.content, payload.enabled
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"skill": skill, "skills": skills_store.list_skills()}


@router.delete("/skills/{slug}")
async def remove_skill(slug: str, x_admin_secret: str = Header(None, alias="X-Admin-Secret")):
    require_admin(x_admin_secret)
    if not skills_store.delete_skill(slug):
        raise HTTPException(status_code=404, detail="Không tìm thấy skill")
    return {"ok": True, "skills": skills_store.list_skills()}


@router.get("/mcp")
async def get_mcp(x_admin_secret: str = Header(None, alias="X-Admin-Secret")):
    require_admin(x_admin_secret)
    return {"servers": mcp_store.list_servers()}


@router.post("/mcp")
async def put_mcp(payload: McpPayload, x_admin_secret: str = Header(None, alias="X-Admin-Secret")):
    require_admin(x_admin_secret)
    try:
        server = mcp_store.upsert_server(
            payload.name, payload.url, payload.transport, payload.enabled
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"server": server, "servers": mcp_store.list_servers(), "restart_required": True}


@router.delete("/mcp/{name}")
async def remove_mcp(name: str, x_admin_secret: str = Header(None, alias="X-Admin-Secret")):
    require_admin(x_admin_secret)
    if not mcp_store.delete_server(name):
        raise HTTPException(status_code=404, detail="Không tìm thấy MCP server")
    return {"ok": True, "servers": mcp_store.list_servers(), "restart_required": True}
