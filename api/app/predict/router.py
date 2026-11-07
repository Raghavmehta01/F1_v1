"""Race prediction routes (stub until LightGBM ships)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.core.auth import require_shared_secret
from app.schemas import DriverPrediction, PredictResponse

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
    """Stub until Phase 3 trains LightGBM."""
    return PredictResponse(
        season=season,
        round=round,
        model_version="stub-0.1.0",
        status="not_trained",
        message="Model not trained yet. Run the Phase 3 training pipeline.",
        predictions=[
            DriverPrediction(
                driver_id="placeholder",
                driver_name="Awaiting training",
                win_probability=0.0,
                podium_probability=0.0,
                rank=1,
            )
        ],
    )
