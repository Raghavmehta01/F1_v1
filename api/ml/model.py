"""Finish-position model load/save + probability mapping."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from ml.features import FEATURE_COLS, matrix
from ml.paths import ARTIFACTS_DIR, META_PATH, MODEL_PATH
from ml.probs import win_and_podium_from_strength


@dataclass
class TrainedModel:
    model: Any
    feature_cols: list[str]
    version: str
    metrics: dict[str, Any]

    def predict_frame(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return df
        # Pad any missing cols for older artifacts.
        work = df.copy()
        for c in self.feature_cols:
            if c not in work.columns:
                work[c] = 0.0 if c != "grid_known" else 0.0
        x = work[self.feature_cols].astype(float).to_numpy()
        pred_finish = np.asarray(self.model.predict(x), dtype=float)
        strength = -pred_finish
        # Prefer grid when known: blend model score with grid ranking.
        if "grid" in work.columns:
            grid = work["grid"].to_numpy(dtype=float)
            known = (
                work["grid_known"].to_numpy(dtype=float)
                if "grid_known" in work.columns
                else np.ones(len(work), dtype=float)
            )
            grid_strength = -(grid - 1.0)
            strength = strength * (0.55 + 0.2 * (1.0 - known)) + grid_strength * (
                0.45 * known
            )
        win, podium, ranks = win_and_podium_from_strength(strength, temperature=1.9)
        out = df.copy()
        out["pred_finish"] = ranks
        out["win_probability"] = win
        out["podium_probability"] = podium
        return out.sort_values("pred_finish").reset_index(drop=True)


def save_model(model: Any, *, version: str, metrics: dict[str, Any]) -> Path:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "model": model,
        "feature_cols": FEATURE_COLS,
        "version": version,
        "metrics": metrics,
    }
    joblib.dump(payload, MODEL_PATH)
    META_PATH.write_text(json.dumps({"version": version, "metrics": metrics}, indent=2))
    return MODEL_PATH


def load_model(path: Path | None = None) -> TrainedModel | None:
    target = path or MODEL_PATH
    if not target.exists():
        return None
    try:
        payload = joblib.load(target)
    except Exception:
        return None
    return TrainedModel(
        model=payload["model"],
        feature_cols=list(payload.get("feature_cols") or FEATURE_COLS),
        version=str(payload.get("version") or "unknown"),
        metrics=dict(payload.get("metrics") or {}),
    )


def _make_regressor() -> tuple[Any, str]:
    try:
        from lightgbm import LGBMRegressor

        return (
            LGBMRegressor(
                n_estimators=320,
                learning_rate=0.05,
                num_leaves=31,
                subsample=0.9,
                colsample_bytree=0.9,
                random_state=42,
                verbose=-1,
            ),
            "lgbm",
        )
    except Exception:
        from sklearn.ensemble import GradientBoostingRegressor

        return (
            GradientBoostingRegressor(
                n_estimators=260,
                learning_rate=0.05,
                max_depth=3,
                random_state=42,
            ),
            "sklearn-gbr",
        )


def train_lgbm(train_df: pd.DataFrame) -> tuple[Any, dict[str, Any]]:
    """Train a regressor on finish position; return model + holdout metrics."""
    from sklearn.metrics import mean_absolute_error
    from sklearn.model_selection import train_test_split

    work = train_df.dropna(subset=FEATURE_COLS + ["position"]).copy()
    x = matrix(work)
    y = work["position"].astype(float).to_numpy()
    x_tr, x_te, y_tr, y_te = train_test_split(x, y, test_size=0.18, random_state=42)

    model, backend = _make_regressor()
    model.fit(x_tr, y_tr)
    pred = model.predict(x_te)
    mae = float(mean_absolute_error(y_te, pred))
    metrics = {
        "mae_finish": round(mae, 3),
        "train_rows": int(len(x_tr)),
        "test_rows": int(len(x_te)),
        "feature_cols": FEATURE_COLS,
        "backend": backend,
    }
    return model, metrics
