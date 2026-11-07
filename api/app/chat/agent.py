"""Fast Groq RAG agent — cached, coalesced, parallel-safe."""

from __future__ import annotations

import json
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from groq import Groq

from app.chat.cache import (
    answer_cache,
    answer_flight,
    cache_key,
    normalize_query,
)
from app.chat.rag import collection_count
from app.chat.tools import (
    TOOL_SPECS,
    run_tool,
    tool_constructor_standings,
    tool_driver_standings,
    tool_last_race_results,
    tool_search_official_regulations,
    tool_season_calendar,
)

# Fast Groq chat model with real `content` (gpt-oss often leaves content empty).
MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
MAX_COMPLETION_TOKENS = int(os.getenv("GROQ_MAX_TOKENS", "320"))
HISTORY_TURNS = 1
MSG_CHAR_CAP = 500
TOOL_RESULT_CAP = 1200
RAG_HITS = 2

FINAL_SYSTEM = """You are F1_v1 Pit Wall. Answer using ONLY the evidence below.
Plain prose, no markdown. Short title, 1-2 short paragraphs, one citation line
(Section · Iss · p.). Prefer Section B for flags/session procedures.
Not affiliated with F1/FIA."""

_RULE_RE = re.compile(
    r"\b(flag|red flag|yellow|green flag|blue flag|parc|fermé|ferme|"
    r"penalty|steward|drs|safety car|vsc|qualify|qualifying|sprint|"
    r"article|regulation|sporting|technical|budget|cost cap|power unit|"
    r"grid|formation|pit lane|track limit|illegal|fia)\b",
    re.I,
)
_STATS_RE = re.compile(
    r"\b(standing|championship|points|winner|result|calendar|who won|"
    r"leader|rank|podium|race weekend|constructor)\b",
    re.I,
)

_groq: Groq | None = None
_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="f1chat")


def _client() -> Groq:
    global _groq
    if _groq is not None:
        return _groq
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        raise RuntimeError("GROQ_API_KEY is not configured")
    _groq = Groq(api_key=key, max_retries=1, timeout=20.0)
    return _groq


def _trim(text: str, n: int = MSG_CHAR_CAP) -> str:
    text = (text or "").strip()
    return text if len(text) <= n else text[: n - 1] + "…"


def _unique_sources(sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for s in sources:
        key = f"{s.get('title')}|{s.get('page')}|{s.get('url')}"
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
        if len(out) >= 3:
            break
    return out


def _sources_from_reg_payload(raw: str) -> list[dict[str, Any]]:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return [
        {
            "title": hit.get("title"),
            "section": hit.get("section"),
            "issue": hit.get("issue"),
            "page": hit.get("page"),
            "url": hit.get("url"),
        }
        for hit in data.get("hits") or []
    ]


def _evidence_pack(tool_payloads: list[str]) -> str:
    bits: list[str] = []
    for raw in tool_payloads[-4:]:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            bits.append(_trim(raw, 400))
            continue
        if "hits" in data:
            for h in (data.get("hits") or [])[:RAG_HITS]:
                bits.append(
                    f"Sec {h.get('section')} Iss {h.get('issue')} p.{h.get('page')}: "
                    f"{_trim(str(h.get('excerpt') or ''), 300)}"
                )
        elif "standings" in data:
            rows = data.get("standings") or []
            bits.append(
                "Standings "
                f"S{data.get('season')} R{data.get('round')}: "
                + "; ".join(
                    f"P{r.get('pos')} {r.get('driver') or r.get('team')} {r.get('points')}pts"
                    for r in rows[:8]
                )
            )
        elif "results" in data:
            rows = data.get("results") or []
            bits.append(
                f"{data.get('raceName')} ({data.get('season')} R{data.get('round')}): "
                + "; ".join(f"P{r.get('pos')} {r.get('driver')}" for r in rows[:8])
            )
        elif "races" in data:
            bits.append(
                "Calendar: "
                + "; ".join(
                    f"R{r.get('round')} {r.get('raceName')} {r.get('date')}"
                    for r in (data.get("races") or [])[:10]
                )
            )
        else:
            bits.append(_trim(raw, 350))
    return "\n".join(bits)[:1800]


def _fallback_from_evidence(evidence: str, sources: list[dict[str, Any]]) -> str:
    if not evidence.strip():
        return "Could not finish under the current token budget. Ask a narrower question."
    cite = ""
    if sources:
        s = sources[0]
        cite = (
            f"\n\nSection {s.get('section')} · Iss {s.get('issue')} · p.{s.get('page')}"
        )
    line = next((ln for ln in evidence.split("\n") if ln.strip()), "")
    return f"Official excerpt\n\n{_trim(line, 700)}{cite}"


def _finalize(
    question: str,
    tool_payloads: list[str],
    sources: list[dict[str, Any]],
) -> str:
    evidence = _evidence_pack(tool_payloads)
    compact = [
        {"role": "system", "content": FINAL_SYSTEM},
        {
            "role": "user",
            "content": (
                f"Question: {_trim(question, 300)}\n\n"
                f"Evidence:\n{evidence}\n\n"
                "Write the answer now."
            ),
        },
    ]
    try:
        completion = _client().chat.completions.create(
            model=MODEL,
            messages=compact,
            temperature=0.1,
            max_tokens=MAX_COMPLETION_TOKENS,
        )
        msg = completion.choices[0].message
        answer = (msg.content or "").strip()
        if not answer:
            # Some Groq models only fill `reasoning`
            answer = (getattr(msg, "reasoning", None) or "").strip()
        if answer:
            return answer
    except Exception:
        pass
    return _fallback_from_evidence(evidence, _unique_sources(sources))


def _prefetch_stats(question: str) -> list[str]:
    """Fetch likely Jolpica payloads in parallel (cached)."""
    q = question.lower()
    jobs: dict[str, Any] = {}
    if "constructor" in q:
        jobs["constructors"] = tool_constructor_standings
    if any(w in q for w in ("standing", "championship", "leader", "points", "rank")):
        jobs["drivers"] = tool_driver_standings
    if any(w in q for w in ("last race", "winner", "who won", "result")):
        jobs["last"] = tool_last_race_results
    if "calendar" in q or "schedule" in q:
        jobs["calendar"] = tool_season_calendar

    if not jobs:
        # generic stats ask — pull drivers + last race
        jobs["drivers"] = tool_driver_standings
        jobs["last"] = tool_last_race_results

    out: list[str] = []
    futures = {_pool.submit(fn): name for name, fn in jobs.items()}
    for fut in as_completed(futures, timeout=10):
        try:
            out.append(fut.result()[:TOOL_RESULT_CAP])
        except Exception as e:
            out.append(json.dumps({"error": str(e), "tool": futures[fut]}))
    return out


def _run_chat_uncached(
    message: str,
    history: list[dict[str, str]] | None,
) -> dict[str, Any]:
    indexed = collection_count()
    if indexed == 0:
        return {
            "answer": (
                "Official FIA regulations are not ingested yet. "
                "Run knowledge ingest first."
            ),
            "sources": [],
            "model": MODEL,
            "tool_calls": [],
            "status": "needs_ingest",
            "collection_count": 0,
            "cached": False,
        }

    question = _trim(message, 900)
    is_rules = bool(_RULE_RE.search(question))
    wants_stats = bool(_STATS_RE.search(question))

    sources: list[dict[str, Any]] = []
    tool_trace: list[dict[str, Any]] = []
    tool_payloads: list[str] = []

    # Parallel prefetch when both rules + stats, else specialized fast paths
    if is_rules and wants_stats:
        fut_reg = _pool.submit(
            tool_search_official_regulations, question, RAG_HITS
        )
        fut_stats = _pool.submit(_prefetch_stats, question)
        seeded = fut_reg.result(timeout=15)
        tool_payloads.append(seeded)
        sources.extend(_sources_from_reg_payload(seeded))
        tool_trace.append(
            {"name": "search_official_regulations", "arguments": {"query": question}}
        )
        stats = fut_stats.result(timeout=12)
        tool_payloads.extend(stats)
        tool_trace.append({"name": "prefetch_stats", "arguments": {}})
        answer = _finalize(question, tool_payloads, sources)
        return {
            "answer": answer,
            "sources": _unique_sources(sources),
            "model": MODEL,
            "tool_calls": tool_trace,
            "status": "ok",
            "collection_count": indexed,
            "cached": False,
        }

    if is_rules:
        seeded = tool_search_official_regulations(question, n_results=RAG_HITS)
        tool_payloads.append(seeded)
        sources.extend(_sources_from_reg_payload(seeded))
        tool_trace.append(
            {"name": "search_official_regulations", "arguments": {"query": question}}
        )
        answer = _finalize(question, tool_payloads, sources)
        return {
            "answer": answer,
            "sources": _unique_sources(sources),
            "model": MODEL,
            "tool_calls": tool_trace,
            "status": "ok",
            "collection_count": indexed,
            "cached": False,
        }

    if wants_stats:
        tool_payloads.extend(_prefetch_stats(question))
        tool_trace.append({"name": "prefetch_stats", "arguments": {}})
        answer = _finalize(question, tool_payloads, sources)
        return {
            "answer": answer,
            "sources": [],
            "model": MODEL,
            "tool_calls": tool_trace,
            "status": "ok",
            "collection_count": indexed,
            "cached": False,
        }

    # Fallback: seed regs + one optional tool round (rare)
    seeded = tool_search_official_regulations(question, n_results=RAG_HITS)
    tool_payloads.append(seeded)
    sources.extend(_sources_from_reg_payload(seeded))
    tool_trace.append(
        {"name": "search_official_regulations", "arguments": {"query": question}}
    )

    # Tiny optional tool call only if clearly needs live data miss
    history = history or []
    _ = history  # history unused for cacheable lightweight path
    try:
        messages = [
            {
                "role": "system",
                "content": (
                    "Call a Jolpica tool only if the question needs live standings/"
                    "results/calendar. Otherwise reply with NO_TOOL."
                ),
            },
            {"role": "user", "content": question},
        ]
        completion = _client().chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=TOOL_SPECS,
            tool_choice="auto",
            temperature=0.1,
            max_tokens=120,
        )
        choice = completion.choices[0].message
        for tc in choice.tool_calls or []:
            name = tc.function.name
            if name == "search_official_regulations":
                continue
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            result = run_tool(name, args)
            tool_payloads.append(result[:TOOL_RESULT_CAP])
            tool_trace.append({"name": name, "arguments": args})
    except Exception:
        pass

    answer = _finalize(question, tool_payloads, sources)
    return {
        "answer": answer,
        "sources": _unique_sources(sources),
        "model": MODEL,
        "tool_calls": tool_trace,
        "status": "ok",
        "collection_count": indexed,
        "cached": False,
    }


def run_chat(
    message: str,
    history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Public entry: TTL answer cache + single-flight coalescing."""
    qn = normalize_query(message)
    # Rules answers ignore history for cache hits (stable FIA text).
    # Stats include a coarse history fingerprint only when present.
    hist_fp = ""
    if history:
        last = history[-1]
        hist_fp = normalize_query((last.get("content") or "")[:80])
    key = cache_key("ans", MODEL, qn, hist_fp)

    hit = answer_cache.get(key)
    if hit is not None:
        out = dict(hit)
        out["cached"] = True
        return out

    def compute() -> dict[str, Any]:
        # Double-check after winning the flight
        again = answer_cache.get(key)
        if again is not None:
            out = dict(again)
            out["cached"] = True
            return out
        result = _run_chat_uncached(message, history)
        if result.get("status") == "ok" and result.get("answer"):
            store = dict(result)
            store["cached"] = False
            answer_cache.set(key, store)
        return result

    return answer_flight.do(key, compute)
