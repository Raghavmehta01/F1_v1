from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "f1_v1-ml"


class DriverPrediction(BaseModel):
    driver_id: str
    driver_name: str
    constructor_id: str | None = None
    win_probability: float = Field(ge=0, le=1)
    podium_probability: float = Field(ge=0, le=1)
    rank: int


class PredictResponse(BaseModel):
    season: int
    round: int
    model_version: str
    status: str
    message: str | None = None
    predictions: list[DriverPrediction] = []


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=16)


class ChatSource(BaseModel):
    title: str | None = None
    section: str | None = None
    issue: str | None = None
    page: int | str | None = None
    url: str | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[ChatSource] = []
    model: str = ""
    status: str = "ok"
    tool_calls: list[dict[str, Any]] = []
    collection_count: int = 0


class KnowledgeStatusResponse(BaseModel):
    collection_count: int = 0
    ready: bool = False
    groq_configured: bool = False


class IngestResponse(BaseModel):
    status: str
    collection_count: int
    documents: list[dict[str, Any]] = []
    hub: str | None = None
