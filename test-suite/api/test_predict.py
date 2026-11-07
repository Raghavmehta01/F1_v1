from __future__ import annotations

from fastapi.testclient import TestClient


def test_predict_stub_returns_not_trained(client: TestClient, secret: str) -> None:
    res = client.get(
        "/predict",
        params={"season": 2026, "round": 3},
        headers={"X-ML-Secret": secret},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["season"] == 2026
    assert body["round"] == 3
    assert body["status"] == "not_trained"
    assert isinstance(body["predictions"], list)
    assert body["predictions"]


def test_predict_validates_season_bounds(client: TestClient, secret: str) -> None:
    res = client.get(
        "/predict",
        params={"season": 1800, "round": 1},
        headers={"X-ML-Secret": secret},
    )
    assert res.status_code == 422
