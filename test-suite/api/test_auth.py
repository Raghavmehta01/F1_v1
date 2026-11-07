from __future__ import annotations

from fastapi.testclient import TestClient


def test_predict_requires_secret(client: TestClient) -> None:
    res = client.get("/predict", params={"season": 2026, "round": 1})
    assert res.status_code == 401


def test_predict_rejects_bad_secret(client: TestClient) -> None:
    res = client.get(
        "/predict",
        params={"season": 2026, "round": 1},
        headers={"X-ML-Secret": "wrong"},
    )
    assert res.status_code == 401


def test_chat_requires_secret(client: TestClient) -> None:
    res = client.post("/chat", json={"message": "What is a red flag?"})
    assert res.status_code == 401
