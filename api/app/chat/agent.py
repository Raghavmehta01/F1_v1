"""Groq agent with official-reg RAG + live stats tools (token-budget aware)."""

from __future__ import annotations

import json
import os
import re
from typing import Any

from groq import Groq

from app.chat.rag import collection_count
from app.chat.tools import TOOL_SPECS, run_tool, tool_search_official_regulations

MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
MAX_TOOL_ROUNDS = 1
MAX_COMPLETION_TOKENS = int(os.getenv("GROQ_MAX_TOKENS", "500"))
HISTORY_TURNS = 2
MSG_CHAR_CAP = 700
TOOL_RESULT_CAP = 1600

SYSTEM_PROMPT = """You are F1_v1 Pit Wall.

For live standings/results/calendar only: call the Jolpica tools.
Regulation answers are already provided as evidence — do not invent articles.

Format (strict):
- Plain prose only. No markdown (#, **, __, bullets with *).
- 1 short title line, then 1–3 short paragraphs.
- One citation line at the end: Section X · Iss Y · p.Z

Not affiliated with F1 or the FIA."""

FINAL_SYSTEM = """You are F1_v1 Pit Wall. Answer using ONLY the evidence below.
Plain prose, no markdown. Short title, 1–3 short paragraphs, one citation line
(Section · Iss · p.). Prefer Section B Sporting excerpts for flags/session procedures.
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
    r"leader|rank|podium|race weekend)\b",
    re.I,
)


def _client() -> Groq:
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        raise RuntimeError("GROQ_API_KEY is not configured")
    return Groq(api_key=key)


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
    return out


def _sources_from_reg_payload(raw: str) -> list[dict[str, Any]]:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    out = []
    for hit in data.get("hits") or []:
        out.append(
            {
                "title": hit.get("title"),
                "section": hit.get("section"),
                "issue": hit.get("issue"),
                "page": hit.get("page"),
                "url": hit.get("url"),
            }
        )
    return out


def _evidence_pack(tool_payloads: list[str], sources: list[dict[str, Any]]) -> str:
    bits: list[str] = []
    for raw in tool_payloads[-4:]:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            bits.append(_trim(raw, 500))
            continue
        if "hits" in data:
            for h in (data.get("hits") or [])[:3]:
                bits.append(
                    f"Sec {h.get('section')} Iss {h.get('issue')} p.{h.get('page')}: "
                    f"{_trim(str(h.get('excerpt') or ''), 380)}"
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
                    for r in (data.get("races") or [])[:12]
                )
            )
        else:
            bits.append(_trim(raw, 400))

    if not bits and sources:
        for s in sources[:3]:
            bits.append(
                f"Sec {s.get('section')} Iss {s.get('issue')} p.{s.get('page')} "
                f"({s.get('title')})"
            )
    return "\n".join(bits)[:2400]


def _fallback_from_evidence(evidence: str, sources: list[dict[str, Any]]) -> str:
    if not evidence.strip():
        return (
            "I could not complete the answer under the current Groq token limit. "
            "Try a narrower question."
        )
    cite = ""
    if sources:
        s = sources[0]
        cite = (
            f"\n\nSection {s.get('section')} · Iss {s.get('issue')} · p.{s.get('page')}"
        )
    lines = [ln.strip() for ln in evidence.split("\n") if ln.strip()][:2]
    body = _trim(" ".join(lines), 900)
    return f"Official excerpt\n\n{body}{cite}"


def _finalize(
    client: Groq,
    question: str,
    tool_payloads: list[str],
    sources: list[dict[str, Any]],
) -> str:
    evidence = _evidence_pack(tool_payloads, sources)
    compact = [
        {"role": "system", "content": FINAL_SYSTEM},
        {
            "role": "user",
            "content": (
                f"Question: {_trim(question, 400)}\n\n"
                f"Evidence:\n{evidence}\n\n"
                "Write the answer now."
            ),
        },
    ]
    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=compact,
            temperature=0.2,
            max_tokens=MAX_COMPLETION_TOKENS,
        )
        answer = (completion.choices[0].message.content or "").strip()
        if answer:
            return answer
    except Exception:
        pass
    return _fallback_from_evidence(evidence, _unique_sources(sources))


def run_chat(
    message: str,
    history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    indexed = collection_count()
    if indexed == 0:
        return {
            "answer": (
                "Official FIA regulations are not ingested yet. "
                "Run knowledge ingest first (POST /chat/ingest or "
                "`python -m scripts.ingest_official`)."
            ),
            "sources": [],
            "model": MODEL,
            "tool_calls": [],
            "status": "needs_ingest",
            "collection_count": 0,
        }

    client = _client()
    history = history or []
    question = _trim(message, 1200)
    is_rules = bool(_RULE_RE.search(question))
    wants_stats = bool(_STATS_RE.search(question))

    sources: list[dict[str, Any]] = []
    tool_trace: list[dict[str, Any]] = []
    tool_payloads: list[str] = []

    # Always seed rules questions with our own Chroma search (stable query, not the model's).
    if is_rules or not wants_stats:
        seeded = tool_search_official_regulations(question, n_results=3)
        tool_payloads.append(seeded)
        sources.extend(_sources_from_reg_payload(seeded))
        tool_trace.append(
            {"name": "search_official_regulations", "arguments": {"query": question}}
        )

    # Rules-only: skip tool loop — finalize from seeded evidence (fits free-tier TPM).
    if is_rules and not wants_stats:
        answer = _finalize(client, question, tool_payloads, sources)
        return {
            "answer": answer,
            "sources": _unique_sources(sources),
            "model": MODEL,
            "tool_calls": tool_trace,
            "status": "ok",
            "collection_count": indexed,
        }

    messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for turn in history[-HISTORY_TURNS:]:
        role = turn.get("role")
        content = _trim(turn.get("content") or "", 400)
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    if tool_payloads:
        messages.append(
            {
                "role": "user",
                "content": (
                    f"{question}\n\n"
                    f"Regulation evidence already retrieved:\n"
                    f"{_evidence_pack(tool_payloads, sources)[:1200]}"
                ),
            }
        )
    else:
        messages.append({"role": "user", "content": question})

    for _ in range(MAX_TOOL_ROUNDS):
        try:
            completion = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                tools=TOOL_SPECS,
                tool_choice="auto",
                temperature=0.2,
                max_tokens=min(MAX_COMPLETION_TOKENS, 350),
            )
        except Exception:
            break

        choice = completion.choices[0].message
        tool_calls = choice.tool_calls or []

        if not tool_calls:
            answer = (choice.content or "").strip()
            if answer:
                return {
                    "answer": answer,
                    "sources": _unique_sources(sources),
                    "model": MODEL,
                    "tool_calls": tool_trace,
                    "status": "ok",
                    "collection_count": indexed,
                }
            break

        for tc in tool_calls:
            name = tc.function.name
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            if name == "search_official_regulations":
                # Prefer already-seeded search; skip duplicate if present
                if any(
                    t.get("name") == "search_official_regulations" for t in tool_trace
                ):
                    continue
                args["n_results"] = min(int(args.get("n_results") or 3), 3)
            result = run_tool(name, args)
            clipped = result[:TOOL_RESULT_CAP]
            tool_payloads.append(clipped)
            tool_trace.append({"name": name, "arguments": args})
            if name == "search_official_regulations":
                sources.extend(_sources_from_reg_payload(result))

        answer = _finalize(client, question, tool_payloads, sources)
        return {
            "answer": answer,
            "sources": _unique_sources(sources),
            "model": MODEL,
            "tool_calls": tool_trace,
            "status": "ok",
            "collection_count": indexed,
        }

    answer = _finalize(client, question, tool_payloads, sources)
    return {
        "answer": answer,
        "sources": _unique_sources(sources),
        "model": MODEL,
        "tool_calls": tool_trace,
        "status": "ok",
        "collection_count": indexed,
    }
