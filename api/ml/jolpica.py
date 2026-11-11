"""Fetch historical F1 results from Jolpica (Ergast-compatible)."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

import httpx
import pandas as pd

from ml.paths import CACHE_DIR

BASE = "https://api.jolpi.ca/ergast/f1"
UA = "Pitwall-ml/0.1 (educational)"


def _get(path: str, *, retries: int = 3) -> dict[str, Any]:
    url = f"{BASE}/{path.lstrip('/')}"
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            with httpx.Client(timeout=45.0, headers={"User-Agent": UA}) as client:
                res = client.get(url)
                res.raise_for_status()
                return res.json()
        except Exception as e:  # noqa: BLE001 — retry network blips
            last_err = e
            time.sleep(0.6 * (attempt + 1))
    raise RuntimeError(f"Jolpica fetch failed for {path}: {last_err}")


def _cache_path(name: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / name


def load_season_results(season: int, *, use_cache: bool = True) -> pd.DataFrame:
    """One row per driver finish for a season."""
    cache = _cache_path(f"results_{season}.json")
    if use_cache and cache.exists():
        payload = json.loads(cache.read_text())
    else:
        payload = _get(f"{season}/results.json?limit=1000")
        if use_cache:
            cache.write_text(json.dumps(payload))

    races = payload.get("MRData", {}).get("RaceTable", {}).get("Races", [])
    rows: list[dict[str, Any]] = []
    for race in races:
        circuit_id = race.get("Circuit", {}).get("circuitId", "")
        for result in race.get("Results", []):
            driver = result.get("Driver", {})
            ctor = result.get("Constructor", {})
            pos_raw = result.get("position")
            try:
                position = int(pos_raw)
            except (TypeError, ValueError):
                position = 30
            try:
                grid = int(result.get("grid") or 0)
            except (TypeError, ValueError):
                grid = 0
            try:
                points = float(result.get("points") or 0)
            except (TypeError, ValueError):
                points = 0.0
            rows.append(
                {
                    "season": int(race.get("season", season)),
                    "round": int(race.get("round", 0)),
                    "race_name": race.get("raceName", ""),
                    "date": race.get("date", ""),
                    "circuit_id": circuit_id,
                    "driver_id": driver.get("driverId", ""),
                    "driver_name": f"{driver.get('givenName', '')} {driver.get('familyName', '')}".strip(),
                    "code": driver.get("code") or "",
                    "constructor_id": ctor.get("constructorId", ""),
                    "constructor_name": ctor.get("name", ""),
                    "grid": grid if grid > 0 else 20,
                    "position": min(max(position, 1), 30),
                    "points": points,
                    "status": result.get("status", ""),
                }
            )
    return pd.DataFrame(rows)


def load_results_range(
    start_season: int,
    end_season: int,
    *,
    use_cache: bool = True,
) -> pd.DataFrame:
    frames = [
        load_season_results(y, use_cache=use_cache)
        for y in range(start_season, end_season + 1)
    ]
    frames = [f for f in frames if not f.empty]
    if not frames:
        return pd.DataFrame()
    df = pd.concat(frames, ignore_index=True)
    return df.sort_values(["season", "round", "position"]).reset_index(drop=True)


def load_driver_standings(season: int | str = "current") -> list[dict[str, Any]]:
    data = _get(f"{season}/driverStandings.json")
    lists = data.get("MRData", {}).get("StandingsTable", {}).get("StandingsLists", [])
    if not lists:
        return []
    return lists[0].get("DriverStandings", [])


def load_calendar(season: int | str = "current") -> list[dict[str, Any]]:
    data = _get(f"{season}.json")
    return data.get("MRData", {}).get("RaceTable", {}).get("Races", [])


def load_qualifying(
    season: int,
    round_num: int,
    *,
    use_cache: bool = True,
) -> dict[str, int]:
    """driver_id → qualifying position (1 = pole). Empty if quali not published."""
    cache = _cache_path(f"qualifying_{season}_{round_num}.json")
    if use_cache and cache.exists():
        payload = json.loads(cache.read_text())
    else:
        try:
            payload = _get(f"{season}/{round_num}/qualifying.json")
        except Exception:
            return {}
        if use_cache:
            cache.write_text(json.dumps(payload))

    races = payload.get("MRData", {}).get("RaceTable", {}).get("Races", [])
    if not races:
        return {}
    out: dict[str, int] = {}
    for row in races[0].get("QualifyingResults", []) or []:
        did = str(row.get("Driver", {}).get("driverId") or "")
        try:
            pos = int(row.get("position") or 0)
        except (TypeError, ValueError):
            pos = 0
        if did and pos > 0:
            out[did] = pos
    return out


def load_race_grid(
    season: int,
    round_num: int,
    *,
    use_cache: bool = True,
) -> dict[str, int]:
    """driver_id → starting grid from race results (if race already has results)."""
    try:
        df = load_season_results(season, use_cache=use_cache)
    except Exception:
        return {}
    if df.empty:
        return {}
    race = df[(df["season"] == season) & (df["round"] == round_num)]
    if race.empty:
        return {}
    return {
        str(r.driver_id): int(r.grid)
        for r in race.itertuples()
        if int(r.grid) > 0
    }
