"""Live F1 data tools (Jolpica) + official regulation search."""

from __future__ import annotations

import json
import re
from typing import Any

import httpx

from app.chat.rag import search_regulations

JOLPICA = "https://api.jolpi.ca/ergast/f1"
UA = "F1_v1-chat/0.1 (educational; +https://localhost)"


def _get(path: str) -> dict[str, Any]:
    url = f"{JOLPICA}/{path.lstrip('/')}"
    with httpx.Client(timeout=25.0, headers={"User-Agent": UA}) as client:
        res = client.get(url)
        res.raise_for_status()
        return res.json()


def _excerpt(text: str | None, limit: int = 450, prefer: str | None = None) -> str:
    """Drop ingest headers; keep body only to save Groq TPM."""
    raw = text or ""
    if "\n\n" in raw:
        raw = raw.split("\n\n", 1)[-1]
    # Drop repeated PDF running headers
    raw = re.sub(
        r"SECTION B: SPORTING REGULATIONS.*?Issue 09\s*",
        "",
        raw,
        flags=re.I | re.S,
    )
    raw = " ".join(raw.split())
    needle = (prefer or "").lower()
    if needle and needle in raw.lower():
        i = raw.lower().index(needle)
        start = max(0, i - 80)
        raw = raw[start:]
    return raw if len(raw) <= limit else raw[: limit - 1] + "…"


_SPORTING_TERMS = (
    "flag",
    "red flag",
    "yellow",
    "safety car",
    "vsc",
    "parc",
    "penalty",
    "sprint",
    "qualify",
    "qualifying",
    "formation",
    "pit lane",
    "grid",
    "race start",
    "suspended",
    "session",
)


def _prefer_hits(hits: list[dict], query: str) -> list[dict]:
    """Prefer chunks that actually contain the query terms; bias to Section B."""
    q = query.lower()
    want_b = any(t in q for t in _SPORTING_TERMS)
    phrases: list[str] = []
    if "red" in q and "flag" in q:
        phrases.append("red flag")
    if "yellow" in q and "flag" in q:
        phrases.append("yellow flag")
    if "parc" in q:
        phrases.append("parc ferm")
    if "safety car" in q:
        phrases.append("safety car")
    tokens = [t for t in q.replace("?", " ").split() if len(t) > 2]

    def score(h: dict) -> tuple:
        text = (h.get("text") or "").lower()
        sec = str(h.get("section") or "")
        dist = float(h.get("distance") or 1.0)
        phrase_hits = sum(1 for p in phrases if p in text)
        token_hits = sum(1 for t in tokens if t in text)
        # Cover/TOC pages are weak even if Section B
        weak = 1 if "convention:" in text or "wmsc approval" in text else 0
        sec_rank = 0 if (want_b and sec == "B") else (2 if sec == "ISC" else 1)
        # Higher phrase/token hits first (negate), then section, then distance
        return (-phrase_hits, -token_hits, weak, sec_rank, dist)

    return sorted(hits, key=score)


def tool_search_official_regulations(query: str, n_results: int = 3) -> str:
    """Search official FIA F1 regulation PDFs (Sporting/Technical/etc.)."""
    n = max(1, min(int(n_results or 3), 3))
    q = (query or "").strip()
    # Light sporting hint — avoid long boilerplate that matches cover pages
    if any(t in q.lower() for t in _SPORTING_TERMS):
        q = f"{q} Sporting Regulations"
    hits = search_regulations(q, n_results=max(n, 8))
    hits = _prefer_hits(hits, query)[:n]
    if not hits:
        return json.dumps(
            {
                "status": "empty",
                "hint": "Chroma has no chunks. Run POST /chat/ingest or scripts.ingest_official.",
            }
        )
    prefer = None
    ql = (query or "").lower()
    if "red" in ql and "flag" in ql:
        prefer = "red flag"
    elif "parc" in ql:
        prefer = "parc ferm"
    elif "safety car" in ql:
        prefer = "safety car"

    compact = [
        {
            "title": h.get("title"),
            "section": h.get("section"),
            "issue": h.get("issue"),
            "page": h.get("page"),
            "url": h.get("url"),
            "excerpt": _excerpt(h.get("text"), prefer=prefer),
        }
        for h in hits
        if str(h.get("section") or "") != "ISC"
        or not any(str(x.get("section")) == "B" for x in hits)
    ][:n]
    # If filter emptied, fall back
    if not compact:
        compact = [
            {
                "title": h.get("title"),
                "section": h.get("section"),
                "issue": h.get("issue"),
                "page": h.get("page"),
                "url": h.get("url"),
                "excerpt": _excerpt(h.get("text"), prefer=prefer),
            }
            for h in hits[:n]
        ]
    return json.dumps({"status": "ok", "hits": compact}, ensure_ascii=False)


def tool_driver_standings(season: str = "current") -> str:
    data = _get(f"{season}/driverStandings.json")
    lists = (
        data.get("MRData", {})
        .get("StandingsTable", {})
        .get("StandingsLists", [])
    )
    if not lists:
        return json.dumps({"status": "empty"})
    standings = lists[0].get("DriverStandings", [])
    rows = []
    for row in standings[:12]:
        d = row.get("Driver", {})
        team = (row.get("Constructors") or [{}])[0]
        rows.append(
            {
                "pos": row.get("position"),
                "points": row.get("points"),
                "wins": row.get("wins"),
                "driver": f"{d.get('givenName')} {d.get('familyName')}",
                "code": d.get("code"),
                "team": team.get("name"),
            }
        )
    return json.dumps(
        {
            "status": "ok",
            "season": lists[0].get("season"),
            "round": lists[0].get("round"),
            "standings": rows,
            "source": "Jolpica / Ergast",
        },
        ensure_ascii=False,
    )


def tool_constructor_standings(season: str = "current") -> str:
    data = _get(f"{season}/constructorStandings.json")
    lists = (
        data.get("MRData", {})
        .get("StandingsTable", {})
        .get("StandingsLists", [])
    )
    if not lists:
        return json.dumps({"status": "empty"})
    standings = lists[0].get("ConstructorStandings", [])
    rows = [
        {
            "pos": row.get("position"),
            "points": row.get("points"),
            "wins": row.get("wins"),
            "team": row.get("Constructor", {}).get("name"),
        }
        for row in standings
    ]
    return json.dumps(
        {
            "status": "ok",
            "season": lists[0].get("season"),
            "round": lists[0].get("round"),
            "standings": rows,
            "source": "Jolpica / Ergast",
        },
        ensure_ascii=False,
    )


def tool_last_race_results() -> str:
    data = _get("current/last/results.json")
    races = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
    if not races:
        return json.dumps({"status": "empty"})
    race = races[0]
    results = []
    for row in race.get("Results", [])[:20]:
        d = row.get("Driver", {})
        results.append(
            {
                "pos": row.get("position"),
                "driver": f"{d.get('givenName')} {d.get('familyName')}",
                "team": row.get("Constructor", {}).get("name"),
                "points": row.get("points"),
                "status": row.get("status"),
                "time": (row.get("Time") or {}).get("time"),
            }
        )
    return json.dumps(
        {
            "status": "ok",
            "season": race.get("season"),
            "round": race.get("round"),
            "raceName": race.get("raceName"),
            "date": race.get("date"),
            "circuit": race.get("Circuit", {}).get("circuitName"),
            "results": results,
            "source": "Jolpica / Ergast",
        },
        ensure_ascii=False,
    )


def tool_season_calendar(season: str = "current") -> str:
    data = _get(f"{season}.json")
    races = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
    rows = [
        {
            "round": r.get("round"),
            "raceName": r.get("raceName"),
            "date": r.get("date"),
            "circuit": r.get("Circuit", {}).get("circuitName"),
            "locality": r.get("Circuit", {}).get("Location", {}).get("locality"),
            "country": r.get("Circuit", {}).get("Location", {}).get("country"),
        }
        for r in races
    ]
    return json.dumps(
        {
            "status": "ok",
            "season": data.get("MRData", {}).get("RaceTable", {}).get("season"),
            "races": rows,
            "source": "Jolpica / Ergast",
        },
        ensure_ascii=False,
    )


def tool_race_results(season: str, round: int) -> str:
    data = _get(f"{season}/{int(round)}/results.json")
    races = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
    if not races:
        return json.dumps({"status": "empty", "season": season, "round": round})
    race = races[0]
    results = []
    for row in race.get("Results", []):
        d = row.get("Driver", {})
        results.append(
            {
                "pos": row.get("position"),
                "driver": f"{d.get('givenName')} {d.get('familyName')}",
                "team": row.get("Constructor", {}).get("name"),
                "points": row.get("points"),
                "status": row.get("status"),
            }
        )
    return json.dumps(
        {
            "status": "ok",
            "season": race.get("season"),
            "round": race.get("round"),
            "raceName": race.get("raceName"),
            "results": results,
            "source": "Jolpica / Ergast",
        },
        ensure_ascii=False,
    )


TOOL_SPECS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "search_official_regulations",
            "description": (
                "Search official FIA Formula 1 regulation PDFs "
                "(Sections A–F and International Sporting Code). "
                "Use for rules, penalties, parc fermé, qualifying, technical limits, "
                "financial regs, flags/procedures described in FIA documents."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Natural-language or article-focused query",
                    },
                    "n_results": {
                        "type": "integer",
                        "description": "Number of chunks (1-3)",
                        "default": 3,
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_driver_standings",
            "description": "Latest or season driver championship standings from Jolpica.",
            "parameters": {
                "type": "object",
                "properties": {
                    "season": {
                        "type": "string",
                        "description": "Year or 'current'",
                        "default": "current",
                    }
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_constructor_standings",
            "description": "Latest or season constructor standings from Jolpica.",
            "parameters": {
                "type": "object",
                "properties": {
                    "season": {"type": "string", "default": "current"}
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_last_race_results",
            "description": "Results of the most recent Grand Prix.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_season_calendar",
            "description": "Full season race calendar.",
            "parameters": {
                "type": "object",
                "properties": {
                    "season": {"type": "string", "default": "current"}
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_race_results",
            "description": "Race results for a specific season and round.",
            "parameters": {
                "type": "object",
                "properties": {
                    "season": {"type": "string"},
                    "round": {"type": "integer"},
                },
                "required": ["season", "round"],
            },
        },
    },
]


def run_tool(name: str, arguments: dict[str, Any]) -> str:
    try:
        if name == "search_official_regulations":
            return tool_search_official_regulations(
                str(arguments.get("query", "")),
                int(arguments.get("n_results") or 6),
            )
        if name == "get_driver_standings":
            return tool_driver_standings(str(arguments.get("season") or "current"))
        if name == "get_constructor_standings":
            return tool_constructor_standings(
                str(arguments.get("season") or "current")
            )
        if name == "get_last_race_results":
            return tool_last_race_results()
        if name == "get_season_calendar":
            return tool_season_calendar(str(arguments.get("season") or "current"))
        if name == "get_race_results":
            return tool_race_results(
                str(arguments["season"]),
                int(arguments["round"]),
            )
        return json.dumps({"error": f"Unknown tool: {name}"})
    except Exception as e:
        return json.dumps({"error": str(e), "tool": name})
