"""Train the Pitwall finish model from Jolpica history.

Usage (from api/):
  python -m ml.train
  python -m ml.train --start 2019 --end 2025
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone

from ml.features import build_training_frame
from ml.jolpica import load_results_range
from ml.model import save_model, train_lgbm
from ml.paths import ARTIFACTS_DIR, META_PATH


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Pitwall LightGBM race model")
    parser.add_argument("--start", type=int, default=2019)
    parser.add_argument("--end", type=int, default=datetime.now(timezone.utc).year - 1)
    parser.add_argument("--no-cache", action="store_true")
    args = parser.parse_args()

    end = max(args.start, args.end)
    print(f"Fetching Jolpica results {args.start}–{end}…")
    results = load_results_range(args.start, end, use_cache=not args.no_cache)
    if results.empty:
        raise SystemExit("No results downloaded — check network / seasons.")

    print(f"Building features from {len(results)} result rows…")
    frame = build_training_frame(results)
    if frame.empty or len(frame) < 200:
        raise SystemExit(f"Not enough training rows ({len(frame)}).")

    print(f"Training LightGBM on {len(frame)} rows…")
    model, metrics = train_lgbm(frame)
    version = f"lgbm-{datetime.now(timezone.utc).strftime('%Y%m%d')}"
    path = save_model(model, version=version, metrics=metrics)
    print(json.dumps({"saved": str(path), "version": version, "metrics": metrics}, indent=2))
    print(f"Meta: {META_PATH}")
    print(f"Artifacts dir: {ARTIFACTS_DIR}")


if __name__ == "__main__":
    main()
