from __future__ import annotations

from pathlib import Path

ML_ROOT = Path(__file__).resolve().parent
ARTIFACTS_DIR = ML_ROOT / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "model.joblib"
META_PATH = ARTIFACTS_DIR / "model_meta.json"
CACHE_DIR = ML_ROOT / "cache"
