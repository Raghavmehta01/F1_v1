"""Filesystem roots for F1 chat knowledge + Chroma."""

from __future__ import annotations

from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[2]
KNOWLEDGE_ROOT = API_ROOT / "knowledge"
OFFICIAL_PDF_DIR = KNOWLEDGE_ROOT / "official"
MANIFEST_PATH = KNOWLEDGE_ROOT / "manifests" / "fia_official.json"
CHROMA_DIR = API_ROOT / "data" / "chroma"
COLLECTION_NAME = "f1_official_regs"
