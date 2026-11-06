"""ChromaDB retrieval over official FIA regulation chunks."""

from __future__ import annotations

import hashlib
from typing import Any

import chromadb
from chromadb.config import Settings

from app.chat.paths import CHROMA_DIR, COLLECTION_NAME

_client: chromadb.PersistentClient | None = None


def get_client() -> chromadb.PersistentClient:
    global _client
    if _client is not None:
        return _client
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    _client = chromadb.PersistentClient(
        path=str(CHROMA_DIR),
        settings=Settings(anonymized_telemetry=False),
    )
    return _client


def get_collection(create: bool = True):
    client = get_client()
    # Prefer get — get_or_create with metadata can mask an existing filled collection.
    try:
        return client.get_collection(COLLECTION_NAME)
    except Exception:
        if not create:
            raise
        return client.create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine", "source": "fia_official"},
        )


def collection_count() -> int:
    try:
        return int(get_collection(create=False).count())
    except Exception:
        try:
            return int(get_collection(create=True).count())
        except Exception:
            return 0


def chunk_id(doc_id: str, page: int, idx: int, text: str) -> str:
    digest = hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]
    return f"{doc_id}:p{page}:c{idx}:{digest}"


def upsert_chunks(
    ids: list[str],
    documents: list[str],
    metadatas: list[dict[str, Any]],
) -> int:
    if not ids:
        return 0
    col = get_collection(create=True)
    # Chroma batch limit — keep modest
    batch = 64
    for i in range(0, len(ids), batch):
        col.upsert(
            ids=ids[i : i + batch],
            documents=documents[i : i + batch],
            metadatas=metadatas[i : i + batch],
        )
    return len(ids)


def reset_collection() -> None:
    client = get_client()
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
    get_collection(create=True)


def search_regulations(query: str, n_results: int = 6) -> list[dict[str, Any]]:
    col = get_collection(create=True)
    if col.count() == 0:
        return []
    n = max(1, min(n_results, 12))
    raw = col.query(query_texts=[query], n_results=n)
    docs = (raw.get("documents") or [[]])[0]
    metas = (raw.get("metadatas") or [[]])[0]
    dists = (raw.get("distances") or [[]])[0]
    out: list[dict[str, Any]] = []
    for i, text in enumerate(docs):
        meta = metas[i] if i < len(metas) else {}
        dist = dists[i] if i < len(dists) else None
        out.append(
            {
                "text": text,
                "title": meta.get("title"),
                "section": meta.get("section"),
                "issue": meta.get("issue"),
                "page": meta.get("page"),
                "url": meta.get("url"),
                "doc_id": meta.get("doc_id"),
                "distance": dist,
            }
        )
    return out
