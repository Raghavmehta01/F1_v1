"""Thread-safe TTL LRU + single-flight coalescing for multi-user chat."""

from __future__ import annotations

import hashlib
import threading
import time
from collections import OrderedDict
from concurrent.futures import Future
from typing import Any, Callable, Generic, TypeVar

T = TypeVar("T")


class TTLCache(Generic[T]):
    def __init__(self, maxsize: int = 512, ttl_sec: float = 300.0) -> None:
        self.maxsize = max(8, maxsize)
        self.ttl_sec = ttl_sec
        self._data: OrderedDict[str, tuple[float, T]] = OrderedDict()
        self._lock = threading.RLock()

    def get(self, key: str) -> T | None:
        now = time.monotonic()
        with self._lock:
            item = self._data.get(key)
            if item is None:
                return None
            expires, value = item
            if expires < now:
                self._data.pop(key, None)
                return None
            self._data.move_to_end(key)
            return value

    def set(self, key: str, value: T) -> None:
        now = time.monotonic()
        with self._lock:
            self._data[key] = (now + self.ttl_sec, value)
            self._data.move_to_end(key)
            while len(self._data) > self.maxsize:
                self._data.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()


class SingleFlight(Generic[T]):
    """One in-flight computation per key — parallel users share the same work."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._inflight: dict[str, Future[T]] = {}

    def do(self, key: str, fn: Callable[[], T]) -> T:
        with self._lock:
            existing = self._inflight.get(key)
            if existing is not None:
                fut = existing
                leader = False
            else:
                fut = Future()
                self._inflight[key] = fut
                leader = True

        if not leader:
            return fut.result(timeout=60)

        try:
            value = fn()
            fut.set_result(value)
            return value
        except BaseException as e:
            fut.set_exception(e)
            raise
        finally:
            with self._lock:
                self._inflight.pop(key, None)


def normalize_query(text: str) -> str:
    return " ".join((text or "").lower().split())


def cache_key(*parts: Any) -> str:
    raw = "|".join(str(p) for p in parts)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


# Shared caches (process-local — single uvicorn worker + threads)
answer_cache: TTLCache[dict[str, Any]] = TTLCache(maxsize=256, ttl_sec=900)
rag_cache: TTLCache[list[dict[str, Any]]] = TTLCache(maxsize=384, ttl_sec=1800)
stats_cache: TTLCache[str] = TTLCache(maxsize=64, ttl_sec=45)
knowledge_cache: TTLCache[int] = TTLCache(maxsize=4, ttl_sec=30)
answer_flight: SingleFlight[dict[str, Any]] = SingleFlight()
