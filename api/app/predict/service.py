"""Prediction orchestration: trained model if present, else form heuristic."""

from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

import pandas as pd

from app.schemas import DriverPrediction, PredictResponse
from ml.features import build_inference_frame, drivers_from_standings
from ml.heuristic import score_rows
from ml.jolpica import (
    load_calendar,
    load_driver_standings,
    load_qualifying,
    load_race_grid,
    load_results_range,
)
from ml.model import TrainedModel, load_model


@lru_cache(maxsize=1)
def _cached_model() -> TrainedModel | None:
    return load_model()


def _load_history(season: int, round_num: int) -> pd.DataFrame:
    """History strictly before the target race (no leakage)."""
    start = max(2018, season - 6)
    frames: list[pd.DataFrame] = []
    try:
        prior = load_results_range(start, max(season - 1, start), use_cache=True)
        if not prior.empty:
            frames.append(prior)
    except Exception:
        pass
    try:
        current = load_results_range(season, season, use_cache=True)
        if not current.empty:
            # Drop target round and later from current season.
            current = current[current["round"] < round_num]
            if not current.empty:
                frames.append(current)
    except Exception:
        pass
    if not frames:
        return pd.DataFrame()
    return pd.concat(frames, ignore_index=True)


def _pick_race(calendar: list[dict[str, Any]], round_num: int) -> dict[str, Any] | None:
    for race in calendar:
        try:
            if int(race.get("round", -1)) == round_num:
                return race
        except (TypeError, ValueError):
            continue
    return calendar[0] if calendar else None


def _resolve_grid(season: int, round_num: int) -> dict[str, int]:
    """Prefer race grid (if results exist), else qualifying positions."""
    grid = load_race_grid(season, round_num, use_cache=True)
    if grid:
        return grid
    return load_qualifying(season, round_num, use_cache=True)


def predict_race(season: int, round_num: int) -> PredictResponse:
    calendar = load_calendar(season)
    if not calendar:
        calendar = load_calendar("current")

    race = _pick_race(calendar, round_num)
    circuit_id = ""
    if race:
        circuit_id = str(race.get("Circuit", {}).get("circuitId") or "")
        try:
            round_num = int(race.get("round", round_num))
        except (TypeError, ValueError):
            pass

    history = _load_history(season, round_num)
    grid_by_driver = _resolve_grid(season, round_num)

    # Entry list: current standings as driver pool (IDs stable enough for season).
    standings = load_driver_standings(season)
    if not standings:
        standings = load_driver_standings("current")
    drivers = drivers_from_standings(standings)

    # If this round already has results, ensure those drivers are included.
    try:
        season_df = load_results_range(season, season, use_cache=True)
        race_df = season_df[
            (season_df["season"] == season) & (season_df["round"] == round_num)
        ]
        if not race_df.empty:
            have = {d["driver_id"] for d in drivers}
            for r in race_df.itertuples():
                did = str(r.driver_id)
                if did in have:
                    continue
                drivers.append(
                    {
                        "driver_id": did,
                        "driver_name": str(r.driver_name),
                        "constructor_id": str(r.constructor_id),
                        "constructor_name": str(r.constructor_name),
                        "season_points": 0.0,
                        "season_position": 12.0,
                    }
                )
    except Exception:
        pass

    frame = build_inference_frame(
        history=history,
        drivers=drivers,
        circuit_id=circuit_id,
        round_num=round_num,
        season=season,
        grid_by_driver=grid_by_driver,
    )

    if frame.empty:
        return PredictResponse(
            season=season,
            round=round_num,
            model_version="none",
            status="unavailable",
            message="No standings available to score.",
            predictions=[],
        )

    grid_coverage = float(frame["grid_known"].mean()) if "grid_known" in frame.columns else 0.0
    model = _cached_model()
    # Retrain-needed if artifact feature set is stale.
    if model is not None and set(model.feature_cols) != set(frame.columns) & set(
        model.feature_cols
    ):
        # Still try — model pads missing cols.
        pass

    if model is not None:
        scored = model.predict_frame(frame)
        status = "ok"
        version = model.version
        message = (
            f"Finish model · grid/quali coverage {grid_coverage:.0%}"
            if grid_coverage > 0
            else "Finish model · standings proxy (no quali/grid yet)"
        )
    else:
        scored = score_rows(frame)
        status = "heuristic"
        version = "heuristic-0.2.0"
        message = "Heuristic form+grid model (train with: python -m ml.train)"

    predictions: list[DriverPrediction] = []
    for i, row in scored.iterrows():
        predictions.append(
            DriverPrediction(
                driver_id=str(row["driver_id"]),
                driver_name=str(row["driver_name"]),
                constructor_id=str(row.get("constructor_id") or "") or None,
                win_probability=round(float(row["win_probability"]), 4),
                podium_probability=round(float(row["podium_probability"]), 4),
                rank=int(row.get("pred_finish") or (i + 1)),
            )
        )

    predictions.sort(key=lambda p: p.rank)
    return PredictResponse(
        season=season,
        round=round_num,
        model_version=version,
        status=status,
        message=message,
        predictions=predictions,
    )


def default_target() -> tuple[int, int]:
    """Next upcoming round on the current calendar, else latest round."""
    year = datetime.now(timezone.utc).year
    calendar = load_calendar("current")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    season = year
    if calendar:
        try:
            season = int(calendar[0].get("season", year))
        except (TypeError, ValueError):
            season = year
    for race in calendar:
        if str(race.get("date") or "") >= today:
            try:
                return season, int(race.get("round", 1))
            except (TypeError, ValueError):
                return season, 1
    if calendar:
        try:
            return season, int(calendar[-1].get("round", 1))
        except (TypeError, ValueError):
            return season, 1
    return year, 1
