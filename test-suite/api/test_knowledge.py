from __future__ import annotations

from fastapi.testclient import TestClient


def test_knowledge_status_shape(client: TestClient) -> None:
    res = client.get("/chat/knowledge")
    assert res.status_code == 200
    body = res.json()
    assert "collection_count" in body
    assert "ready" in body
    assert "groq_configured" in body
    assert isinstance(body["collection_count"], int)
    assert isinstance(body["ready"], bool)
