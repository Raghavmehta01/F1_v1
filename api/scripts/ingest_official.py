"""CLI: download official FIA PDFs and rebuild Chroma index.

Usage (from api/ with venv active):
  python -m scripts.ingest_official
  python -m scripts.ingest_official --force-download
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Allow `python -m scripts.ingest_official` from api/
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from app.chat.ingest import ingest_all  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest official FIA F1 regulation PDFs")
    parser.add_argument(
        "--force-download",
        action="store_true",
        help="Re-download PDFs even if cached",
    )
    parser.add_argument(
        "--no-reset",
        action="store_true",
        help="Do not wipe the Chroma collection before upsert",
    )
    args = parser.parse_args()
    result = ingest_all(reset=not args.no_reset, force_download=args.force_download)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
