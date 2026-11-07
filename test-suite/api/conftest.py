"""Pytest fixtures for the FastAPI service."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

API_ROOT = Path(__file__).resolve().parents[2] / "api"
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

os.environ.setdefault("ML_SHARED_SECRET", "test-ml-secret")
os.environ.setdefault("GROQ_API_KEY", "")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")


@pytest.fixture()
def client() -> TestClient:
    from app.main import app

    return TestClient(app)


@pytest.fixture()
def secret() -> str:
    return os.environ["ML_SHARED_SECRET"]
