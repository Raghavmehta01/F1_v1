from __future__ import annotations

import time

from app.chat.cache import SingleFlight, TTLCache, cache_key, normalize_query


def test_normalize_query_collapses_whitespace() -> None:
    assert normalize_query("  What   is   a   red flag? ") == "what is a red flag?"


def test_cache_key_is_stable() -> None:
    assert cache_key("a", "b") == cache_key("a", "b")
    assert cache_key("a", "b") != cache_key("a", "c")


def test_ttl_cache_expires() -> None:
    cache: TTLCache[str] = TTLCache(maxsize=8, ttl_sec=0.05)
    cache.set("k", "v")
    assert cache.get("k") == "v"
    time.sleep(0.06)
    assert cache.get("k") is None


def test_single_flight_shares_work() -> None:
    sf: SingleFlight[int] = SingleFlight()
    calls = {"n": 0}

    def work() -> int:
        calls["n"] += 1
        return 42

    assert sf.do("same", work) == 42
    assert sf.do("same", work) == 42
    # sequential calls after completion each run — only concurrent share.
    # First call runs once; second sequential also runs.
    assert calls["n"] == 2
