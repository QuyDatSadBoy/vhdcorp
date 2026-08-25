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
from app.deep import agent_mode, mcp_store, skills_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/deep")


class SkillPayload(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field("", max_length=500)
    content: str = Field("", max_length=20_000)
    enabled: bool = True


class ModePayload(BaseModel):
    mode: str | None = None
    rules: list[str] | None = None


class McpPayload(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    url: str = Field(min_length=1, max_length=500)
    transport: str = "streamable_http"
    enabled: bool = True


def _builtin_skills() -> list[dict]:
    """5 SKILL bán hàng viết sẵn trong mã nguồn (agent/skills/*/SKILL.md).

    Admin cần THẤY chúng để biết trợ lý đang có sẵn tri thức gì — trước đây trang
    quản trị chỉ liệt kê skill do admin tự thêm nên trông như trợ lý chẳng có gì.
    Đánh dấu `builtin` để giao diện hiện dạng chỉ-đọc: muốn đổi thì sửa file trong
    mã nguồn rồi phát hành, không sửa qua web.
    """
    from app.deep import default_skills

    out: list[dict] = []
    for path, data in default_skills.to_files().items():
        body = data.get("content", "")
        # Frontmatter `name` buộc phải là slug (DeepAgents dùng nó làm khoá), nên tên
        # đọc được cho người nằm ở heading `# ...` đầu tiên của phần nội dung.
        title, description = "", ""
        for line in body.splitlines():
            line = line.strip()
            if line.startswith("description:") and not description:
                description = line[12:].strip().strip("\"'")
            elif line.startswith("# ") and not title:
                title = line[2:].strip()
            if title and description:
                break
        name = title
        slug = path.strip("/").split("/")[-2] if "/" in path.strip("/") else path
        out.append({
            "name": name or slug,
            "description": description,
            "content": body,
            "enabled": True,
            "slug": slug,
            "builtin": True,
        })
    return out


@router.get("/skills")
async def get_skills(x_admin_secret: str = Header(None, alias="X-Admin-Secret")):
    require_admin(x_admin_secret)
    custom = skills_store.list_skills()
    custom_slugs = {s.get("slug") for s in custom}
    builtin = [s for s in _builtin_skills() if s["slug"] not in custom_slugs]
    return {"skills": [*builtin, *custom]}


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


@router.get("/mode")
async def get_mode(x_admin_secret: str = Header(None, alias="X-Admin-Secret")):
    require_admin(x_admin_secret)
    return agent_mode.get_state()


@router.post("/mode")
async def put_mode(payload: ModePayload, x_admin_secret: str = Header(None, alias="X-Admin-Secret")):
    require_admin(x_admin_secret)
    try:
        return agent_mode.save(payload.mode, payload.rules)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


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
