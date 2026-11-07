"""Chat + official knowledge ingest routes (async, concurrent)."""

from __future__ import annotations

import asyncio
import os
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.auth import require_shared_secret
from app.chat.agent import run_chat
from app.chat.ingest import ingest_all
from app.chat.rag import collection_count
from app.schemas import (
    ChatRequest,
    ChatResponse,
    ChatSource,
    IngestResponse,
    KnowledgeStatusResponse,
)

router = APIRouter(prefix="/chat", tags=["chat"])

# Bound concurrent LLM/RAG work so a traffic spike doesn't melt the host.
_CHAT_SEM = asyncio.Semaphore(int(os.getenv("CHAT_CONCURRENCY", "24")))


@router.get("/knowledge", response_model=KnowledgeStatusResponse)
async def knowledge_status() -> KnowledgeStatusResponse:
    count = await asyncio.to_thread(collection_count)
    return KnowledgeStatusResponse(
        collection_count=count,
        ready=count > 0,
        groq_configured=bool(os.getenv("GROQ_API_KEY", "").strip()),
    )


@router.post(
    "/ingest",
    response_model=IngestResponse,
    dependencies=[Depends(require_shared_secret)],
)
async def ingest_knowledge(
    reset: bool = True,
    force_download: bool = False,
) -> IngestResponse:
    """Download latest FIA official PDFs and (re)build Chroma index."""
    try:
        result = await asyncio.to_thread(
            ingest_all, reset=reset, force_download=force_download
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingest failed: {e}",
        ) from e
    return IngestResponse(
        status="ok",
        collection_count=int(result["collection_count"]),
        documents=result["documents"],
        hub=result.get("hub"),
    )


@router.post(
    "",
    response_model=ChatResponse,
    dependencies=[Depends(require_shared_secret)],
)
async def chat(body: ChatRequest, response: Response) -> ChatResponse:
    message = (body.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")
    if len(message) > 2000:
        raise HTTPException(status_code=400, detail="message too long")

    history = [{"role": m.role, "content": m.content} for m in body.history]

    async with _CHAT_SEM:
        try:
            result: dict[str, Any] = await asyncio.to_thread(
                run_chat, message, history
            )
        except RuntimeError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(e),
            ) from e
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Chat failed: {e}",
            ) from e

    cached = bool(result.get("cached"))
    response.headers["X-Cache"] = "HIT" if cached else "MISS"
    response.headers["Cache-Control"] = (
        "private, max-age=60" if cached else "no-store"
    )

    return ChatResponse(
        answer=result["answer"],
        sources=[ChatSource(**s) for s in result.get("sources") or [] if s],
        model=result.get("model") or "",
        status=result.get("status") or "ok",
        tool_calls=result.get("tool_calls") or [],
        collection_count=int(
            result.get("collection_count") or collection_count()
        ),
        cached=cached,
    )
