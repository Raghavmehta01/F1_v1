"""F1_v1 API — ML predictions + official-reg RAG chat."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.chat.router import router as chat_router
from app.predict.router import router as predict_router
from app.schemas import HealthResponse

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
load_dotenv(Path(__file__).resolve().parents[2] / ".env")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Warm Chroma + embedding path so first chat isn't cold.
    try:
        from app.chat.rag import warm_rag

        warm_rag()
    except Exception:
        pass
    yield


app = FastAPI(title="F1_v1 API", version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["X-ML-Secret", "Content-Type"],
    expose_headers=["X-Cache"],
)

app.include_router(chat_router)
app.include_router(predict_router)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()
