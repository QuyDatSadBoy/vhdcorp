"""Endpoint admin: bảo vệ bằng header bí mật + resync (mock) + emails (mock)."""


async def test_resync_missing_secret(client):
    resp = await client.post("/api/admin/resync-products")
    assert resp.status_code == 403


async def test_resync_wrong_secret(client):
    resp = await client.post(
        "/api/admin/resync-products", headers={"X-Resync-Secret": "wrong"}
    )
    assert resp.status_code == 403


async def test_resync_success(client, monkeypatch):
    from app.api import admin as admin_api
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "resync_secret", "test-resync")  # secret giờ fail-closed

    async def fake_sync(be_api_url, output_path):
        return 8

    monkeypatch.setattr(admin_api, "sync_products", fake_sync)
    resp = await client.post(
        "/api/admin/resync-products", headers={"X-Resync-Secret": "test-resync"}
    )
    assert resp.status_code == 200
    assert resp.json()["count"] == 8


async def test_emails_wrong_secret(client):
    resp = await client.get("/api/admin/emails", headers={"X-Admin-Secret": "wrong"})
    assert resp.status_code == 403


async def test_admin_fail_closed_when_secret_unset(client, monkeypatch):
    """Secret CHƯA cấu hình ('') → TỪ CHỐI mọi request admin (không 'rỗng khớp rỗng')."""
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "admin_secret", "")
    assert (await client.get("/api/admin/emails")).status_code == 403
    assert (await client.get("/api/admin/emails", headers={"X-Admin-Secret": ""})).status_code == 403
    # secret mặc định cũ đã bị khai tử → cũng bị từ chối
    assert (await client.get("/api/admin/emails", headers={"X-Admin-Secret": "vhdcorp-admin"})).status_code == 403


async def test_emails_success(client, monkeypatch):
    from app.api import admin as admin_api
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "admin_secret", "test-admin")  # secret giờ fail-closed

    def fake_list(limit=10, unread_only=False):
        return [
            {"from": "a@x.com", "subject": "S1", "date": "D", "snippet": "snip", "unread": True}
        ]

    monkeypatch.setattr(admin_api, "list_recent_emails", fake_list)
    resp = await client.get("/api/admin/emails", headers={"X-Admin-Secret": "test-admin"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["count"] == 1
    assert body["emails"][0]["subject"] == "S1"
