"""Standings + form heuristic when LightGBM artifact is missing."""

from __future__ import annotations

import numpy as np
import pandas as pd

from ml.probs import softmax, win_and_podium_from_strength

# Back-compat for older imports
_softmax = softmax


def score_rows(df: pd.DataFrame) -> pd.DataFrame:
    """Attach win/podium probabilities from a tempered strength score."""
    if df.empty:
        return df

    n = len(df)
    season_pts = df["season_points"].to_numpy(dtype=float)
    form_pts = df["driver_points_5"].to_numpy(dtype=float)
    season_pos = df["season_position"].to_numpy(dtype=float)
    avg_finish = df["driver_avg_finish_5"].to_numpy(dtype=float)
    avg3 = df.get("driver_avg_finish_3", avg_finish)
    if hasattr(avg3, "to_numpy"):
        avg3 = avg3.to_numpy(dtype=float)
    circuit_avg = df["circuit_driver_avg"].to_numpy(dtype=float)
    team_avg = df["constructor_avg_finish_5"].to_numpy(dtype=float)
    grid = df["grid"].to_numpy(dtype=float)
    grid_known = (
        df["grid_known"].to_numpy(dtype=float)
        if "grid_known" in df.columns
        else np.ones(n, dtype=float)
    )

    # Grid dominates when known; season form is secondary.
    score = (
        -(grid - 1.0) * (1.15 * grid_known + 0.25 * (1.0 - grid_known))
        + np.log1p(form_pts) * 0.55
        + (21.0 - avg3) * 0.35
        + (21.0 - avg_finish) * 0.2
        + (21.0 - circuit_avg) * 0.25
        + (21.0 - team_avg) * 0.15
        + np.log1p(season_pts) * 0.35
        + (n + 1 - season_pos) * 0.12
    )

    win, podium, ranks = win_and_podium_from_strength(score, temperature=2.2)
    out = df.copy()
    out["win_probability"] = win
    out["podium_probability"] = podium
    out["pred_finish"] = ranks
    return out.sort_values("pred_finish").reset_index(drop=True)
