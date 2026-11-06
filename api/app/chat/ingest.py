"""Download official FIA PDFs and ingest into Chroma."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import httpx
from pypdf import PdfReader

from app.chat.paths import MANIFEST_PATH, OFFICIAL_PDF_DIR
from app.chat.rag import chunk_id, collection_count, reset_collection, upsert_chunks

USER_AGENT = "F1_v1-knowledge/0.1 (educational RAG; local ingest)"
CHUNK_CHARS = 1400
CHUNK_OVERLAP = 200


def load_manifest() -> dict[str, Any]:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def download_pdf(url: str, dest: Path, force: bool = False) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 10_000 and not force:
        return dest
    with httpx.Client(
        timeout=120.0,
        follow_redirects=True,
        headers={"User-Agent": USER_AGENT},
    ) as client:
        res = client.get(url)
        res.raise_for_status()
        dest.write_bytes(res.content)
    return dest


def _clean_page_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def extract_pages(pdf_path: Path) -> list[tuple[int, str]]:
    reader = PdfReader(str(pdf_path))
    pages: list[tuple[int, str]] = []
    for i, page in enumerate(reader.pages):
        raw = page.extract_text() or ""
        cleaned = _clean_page_text(raw)
        if len(cleaned) < 40:
            continue
        pages.append((i + 1, cleaned))
    return pages


def chunk_text(text: str, size: int = CHUNK_CHARS, overlap: int = CHUNK_OVERLAP) -> list[str]:
    if len(text) <= size:
        return [text]
    chunks: list[str] = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + size, n)
        # prefer break on paragraph / sentence
        if end < n:
            window = text[start:end]
            br = max(window.rfind("\n\n"), window.rfind(". "), window.rfind("\n"))
            if br > size * 0.45:
                end = start + br + 1
        piece = text[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= n:
            break
        start = max(end - overlap, start + 1)
    return chunks


def ingest_document(doc: dict[str, Any], force_download: bool = False) -> dict[str, Any]:
    pdf_path = OFFICIAL_PDF_DIR / doc["filename"]
    download_pdf(doc["url"], pdf_path, force=force_download)
    pages = extract_pages(pdf_path)

    ids: list[str] = []
    documents: list[str] = []
    metadatas: list[dict[str, Any]] = []

    for page_no, page_text in pages:
        for idx, chunk in enumerate(chunk_text(page_text)):
            cid = chunk_id(doc["id"], page_no, idx, chunk)
            header = (
                f"SOURCE: {doc['title']}\n"
                f"SECTION: {doc['section']} · ISSUE: {doc['issue']} · DATE: {doc['date']}\n"
                f"PAGE: {page_no}\n"
                f"URL: {doc['url']}\n\n"
            )
            ids.append(cid)
            documents.append(header + chunk)
            metadatas.append(
                {
                    "doc_id": doc["id"],
                    "title": doc["title"],
                    "section": str(doc["section"]),
                    "issue": str(doc["issue"]),
                    "date": str(doc["date"]),
                    "page": int(page_no),
                    "url": doc["url"],
                    "publisher": "FIA",
                }
            )

    written = upsert_chunks(ids, documents, metadatas)
    return {
        "doc_id": doc["id"],
        "pages": len(pages),
        "chunks": written,
        "path": str(pdf_path),
    }


def ingest_all(*, reset: bool = False, force_download: bool = False) -> dict[str, Any]:
    manifest = load_manifest()
    docs = sorted(manifest["documents"], key=lambda d: d.get("priority", 99))
    if reset:
        reset_collection()

    results = []
    for doc in docs:
        results.append(ingest_document(doc, force_download=force_download))

    return {
        "publisher": manifest.get("publisher"),
        "hub": manifest.get("hub"),
        "documents": results,
        "collection_count": collection_count(),
    }
