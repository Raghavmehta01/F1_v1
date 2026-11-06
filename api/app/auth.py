"""Shared-secret auth between Next.js and FastAPI."""

from __future__ import annotations

import os
import secrets

from fastapi import Header, HTTPException, status


def require_shared_secret(
    x_ml_secret: str | None = Header(default=None, alias="X-ML-Secret"),
) -> None:
    expected = os.getenv("ML_SHARED_SECRET", "")
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML_SHARED_SECRET is not configured",
        )
    if not x_ml_secret or not secrets.compare_digest(x_ml_secret, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing shared secret",
        )
