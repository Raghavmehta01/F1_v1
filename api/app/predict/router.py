"""Race prediction routes (LightGBM or heuristic fallback)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import require_shared_secret
from app.predict.service import predict_race
from app.schemas import PredictResponse

router = APIRouter(tags=["predict"])


@router.get(
    "/predict",
    response_model=PredictResponse,
    dependencies=[Depends(require_shared_secret)],
)
def predict(
    season: int = Query(..., ge=1950, le=2100),
    round: int = Query(..., ge=1, le=30),
) -> PredictResponse:
    try:
        return predict_race(season, round)
    except Exception as e:  # noqa: BLE001 — surface upstream failures cleanly
        raise HTTPException(status_code=502, detail=f"Prediction failed: {e}") from e
