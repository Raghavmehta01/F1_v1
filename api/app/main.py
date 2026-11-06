"""F1_v1 API — ML predictions + official-reg RAG chat."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from app.auth import require_shared_secret
from app.chat.router import router as chat_router
from app.schemas import DriverPrediction, HealthResponse, PredictResponse

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
# Also allow web-style env at monorepo root when running locally
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

app = FastAPI(title="F1_v1 API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["X-ML-Secret", "Content-Type"],
)

app.include_router(chat_router)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@app.get("/predict", response_model=PredictResponse, dependencies=[Depends(require_shared_secret)])
def predict(
    season: int = Query(..., ge=1950, le=2100),
    round: int = Query(..., ge=1, le=30),
) -> PredictResponse:
    """Stub until Phase 3 trains LightGBM. Returns empty ranked list with clear status."""
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
