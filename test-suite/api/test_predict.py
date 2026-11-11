from __future__ import annotations

from fastapi.testclient import TestClient


def test_predict_returns_ranked_grid(client: TestClient, secret: str, monkeypatch) -> None:
    """Service may hit network; stub predict_race for unit stability."""
    from app.schemas import DriverPrediction, PredictResponse
    from app.predict import router as predict_router

    def fake_predict(season: int, round: int) -> PredictResponse:
        return PredictResponse(
            season=season,
            round=round,
            model_version="heuristic-0.1.0",
            status="heuristic",
            message="test",
            predictions=[
                DriverPrediction(
                    driver_id="norris",
                    driver_name="Lando Norris",
                    constructor_id="mclaren",
                    win_probability=0.32,
                    podium_probability=0.61,
                    rank=1,
                ),
                DriverPrediction(
                    driver_id="verstappen",
                    driver_name="Max Verstappen",
                    constructor_id="red_bull",
                    win_probability=0.28,
                    podium_probability=0.55,
                    rank=2,
                ),
            ],
        )

    monkeypatch.setattr(predict_router, "predict_race", fake_predict)

    res = client.get(
        "/predict",
        params={"season": 2026, "round": 21},
        headers={"X-ML-Secret": secret},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["season"] == 2026
    assert body["round"] == 21
    assert body["status"] in {"ok", "heuristic", "unavailable"}
    assert isinstance(body["predictions"], list)
    assert body["predictions"]
    assert body["predictions"][0]["rank"] == 1
    assert 0 <= body["predictions"][0]["win_probability"] <= 1


def test_predict_validates_season_bounds(client: TestClient, secret: str) -> None:
    res = client.get(
        "/predict",
        params={"season": 1800, "round": 1},
        headers={"X-ML-Secret": secret},
    )
    assert res.status_code == 422
