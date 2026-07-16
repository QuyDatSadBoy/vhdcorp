import pytest
"""A2A (§9.5): Agent Card + JSON-RPC message/send."""


async def test_agent_card(client):
    resp = await client.get("/.well-known/agent-card.json")
    assert resp.status_code == 200
    card = resp.json()
    assert card["name"] == "VHD Corp Assistant"
    assert card["url"].endswith("/a2a")
    assert card["defaultInputModes"] == ["text"]
    assert card["defaultOutputModes"] == ["text"]
    skill_ids = {s["id"] for s in card["skills"]}
    assert {"product-qa", "create-contact"} <= skill_ids
    assert "capabilities" in card


@pytest.mark.live
async def test_a2a_message_send(client):
    body = {
        "jsonrpc": "2.0",
        "id": "req-1",
        "method": "message/send",
        "params": {
            "message": {
                "role": "user",
                "parts": [{"kind": "text", "text": "Ống nhựa PVC D21 giá bao nhiêu?"}],
            }
        },
    }
    resp = await client.post("/a2a", json=body)
    assert resp.status_code == 200
    data = resp.json()
    assert data["jsonrpc"] == "2.0"
    assert data["id"] == "req-1"
    parts = data["result"]["parts"]
    text = " ".join(p.get("text", "") for p in parts)
    assert text.strip()


async def test_a2a_unknown_method(client):
    body = {"jsonrpc": "2.0", "id": 5, "method": "tasks/get", "params": {}}
    resp = await client.post("/a2a", json=body)
    data = resp.json()
    assert data["error"]["code"] == -32601
