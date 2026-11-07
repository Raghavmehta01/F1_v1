from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas import ChatRequest


def test_chat_request_accepts_valid_payload() -> None:
    req = ChatRequest(
        message="What is parc ferme?",
        history=[{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello"}],
    )
    assert req.message.startswith("What")
    assert len(req.history) == 2


def test_chat_request_rejects_empty_message() -> None:
    with pytest.raises(ValidationError):
        ChatRequest(message="")


def test_chat_request_rejects_oversized_message() -> None:
    with pytest.raises(ValidationError):
        ChatRequest(message="x" * 2001)
