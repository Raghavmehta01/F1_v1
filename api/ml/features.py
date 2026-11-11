"""Feature engineering for race-finish models."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

FEATURE_COLS = [
    "grid",
    "grid_known",
    "round",
    "driver_avg_finish_5",
    "driver_points_5",
    "driver_wins_5",
    "driver_podiums_5",
    "driver_avg_finish_3",
    "constructor_avg_finish_5",
    "circuit_driver_avg",
    "circuit_constructor_avg",
    "season_points",
    "season_position",
]


def _rolling_driver_stats(history: pd.DataFrame, driver_id: str) -> dict[str, float]:
    prev = history[history["driver_id"] == driver_id]
    last5 = prev.tail(5)
    last3 = prev.tail(3)
    if last5.empty:
        return {
            "driver_avg_finish_5": 12.0,
            "driver_points_5": 0.0,
            "driver_wins_5": 0.0,
            "driver_podiums_5": 0.0,
            "driver_avg_finish_3": 12.0,
        }
    return {
        "driver_avg_finish_5": float(last5["position"].mean()),
        "driver_points_5": float(last5["points"].sum()),
        "driver_wins_5": float((last5["position"] == 1).sum()),
        "driver_podiums_5": float((last5["position"] <= 3).sum()),
        "driver_avg_finish_3": float(last3["position"].mean()) if not last3.empty else 12.0,
    }


def _rolling_constructor_avg(history: pd.DataFrame, constructor_id: str, n: int = 10) -> float:
    prev = history[history["constructor_id"] == constructor_id].tail(n)
    if prev.empty:
        return 12.0
    return float(prev["position"].mean())


def _circuit_avg(
    history: pd.DataFrame,
    *,
    circuit_id: str,
    key: str,
    value: str,
    default: float = 12.0,
) -> float:
    prev = history[(history["circuit_id"] == circuit_id) & (history[key] == value)]
    if prev.empty:
        return default
    return float(prev["position"].mean())


def standings_before_race(history: pd.DataFrame, season: int) -> dict[str, dict[str, float]]:
    """Championship points/position using only races already in history for this season."""
    season_so_far = history[history["season"] == season]
    if season_so_far.empty:
        return {}
    points = season_so_far.groupby("driver_id")["points"].sum().to_dict()
    ranked = sorted(points.items(), key=lambda kv: (-kv[1], kv[0]))
    out: dict[str, dict[str, float]] = {}
    for i, (did, pts) in enumerate(ranked):
        out[str(did)] = {"season_points": float(pts), "season_position": float(i + 1)}
    return out


def build_training_frame(results: pd.DataFrame) -> pd.DataFrame:
    """Expand results into supervised rows using only prior races as features."""
    if results.empty:
        return pd.DataFrame()

    df = results.sort_values(["season", "round", "position"]).reset_index(drop=True)
    rows: list[dict[str, Any]] = []

    for (season, rnd), race in df.groupby(["season", "round"], sort=True):
        history = df[(df["season"] < season) | ((df["season"] == season) & (df["round"] < rnd))]
        standing = standings_before_race(history, int(season))
        circuit_id = str(race.iloc[0]["circuit_id"])
        for _, r in race.iterrows():
            did = str(r["driver_id"])
            cid = str(r["constructor_id"])
            stats = _rolling_driver_stats(history, did)
            grid = float(r["grid"]) if float(r["grid"]) > 0 else float(
                standing.get(did, {}).get("season_position", 12)
            )
            grid_known = 1.0 if float(r["grid"]) > 0 else 0.0
            st = standing.get(did, {"season_points": 0.0, "season_position": 12.0})
            rows.append(
                {
                    "season": int(season),
                    "round": int(rnd),
                    "circuit_id": circuit_id,
                    "driver_id": did,
                    "driver_name": str(r["driver_name"]),
                    "constructor_id": cid,
                    "constructor_name": str(r["constructor_name"]),
                    "grid": grid,
                    "grid_known": grid_known,
                    "position": float(min(int(r["position"]), 20)),
                    "season_points": float(st["season_points"]),
                    "season_position": float(st["season_position"]),
                    "constructor_avg_finish_5": _rolling_constructor_avg(history, cid),
                    "circuit_driver_avg": _circuit_avg(
                        history, circuit_id=circuit_id, key="driver_id", value=did
                    ),
                    "circuit_constructor_avg": _circuit_avg(
                        history, circuit_id=circuit_id, key="constructor_id", value=cid
                    ),
                    **stats,
                }
            )

    return pd.DataFrame(rows)


def build_inference_frame(
    *,
    history: pd.DataFrame,
    drivers: list[dict[str, Any]],
    circuit_id: str,
    round_num: int,
    season: int,
    grid_by_driver: dict[str, int] | None = None,
) -> pd.DataFrame:
    """Feature rows for a target race.

    `drivers` entries: driver_id, driver_name, constructor_id, constructor_name
    `grid_by_driver`: real quali/grid when known; else season position proxy.
    """
    grid_by_driver = grid_by_driver or {}
    standing = standings_before_race(history, season)
    rows: list[dict[str, Any]] = []

    for row in drivers:
        did = str(row.get("driver_id") or "")
        cid = str(row.get("constructor_id") or "")
        if not did:
            continue
        st = standing.get(
            did,
            {
                "season_points": float(row.get("season_points") or 0.0),
                "season_position": float(row.get("season_position") or 12.0),
            },
        )
        stats = _rolling_driver_stats(history, did)
        if did in grid_by_driver and grid_by_driver[did] > 0:
            grid = float(grid_by_driver[did])
            grid_known = 1.0
        else:
            # Neutral midfield until quali/grid — do not leak championship order
            # into the `grid` feature (that made leaders look ~100% podium).
            grid = 10.0
            grid_known = 0.0

        rows.append(
            {
                "season": season,
                "round": float(round_num),
                "circuit_id": circuit_id,
                "driver_id": did,
                "driver_name": str(row.get("driver_name") or did),
                "constructor_id": cid,
                "constructor_name": str(row.get("constructor_name") or ""),
                "grid": grid,
                "grid_known": grid_known,
                "season_points": float(st["season_points"]),
                "season_position": float(st["season_position"]),
                "constructor_avg_finish_5": _rolling_constructor_avg(history, cid),
                "circuit_driver_avg": _circuit_avg(
                    history, circuit_id=circuit_id, key="driver_id", value=did
                ),
                "circuit_constructor_avg": _circuit_avg(
                    history, circuit_id=circuit_id, key="constructor_id", value=cid
                ),
                **stats,
            }
        )
    return pd.DataFrame(rows)


def drivers_from_standings(standings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for row in standings:
        driver = row.get("Driver", {})
        ctors = row.get("Constructors") or [{}]
        ctor = ctors[0] if ctors else {}
        did = str(driver.get("driverId") or "")
        if not did:
            continue
        try:
            season_points = float(row.get("points") or 0)
        except (TypeError, ValueError):
            season_points = 0.0
        try:
            season_position = float(row.get("position") or 12)
        except (TypeError, ValueError):
            season_position = 12.0
        out.append(
            {
                "driver_id": did,
                "driver_name": f"{driver.get('givenName', '')} {driver.get('familyName', '')}".strip(),
                "constructor_id": str(ctor.get("constructorId") or ""),
                "constructor_name": str(ctor.get("name") or ""),
                "season_points": season_points,
                "season_position": season_position,
            }
        )
    return out


def matrix(df: pd.DataFrame) -> np.ndarray:
    return df[FEATURE_COLS].astype(float).to_numpy()
