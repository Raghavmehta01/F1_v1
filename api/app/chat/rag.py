"""ChromaDB retrieval over official FIA regulation chunks."""

from __future__ import annotations

import hashlib
from typing import Any

import chromadb
from chromadb.config import Settings

from app.chat.cache import cache_key, knowledge_cache, normalize_query, rag_cache
from app.chat.paths import CHROMA_DIR, COLLECTION_NAME

_client: chromadb.PersistentClient | None = None
_collection = None


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
    global _collection
    if _collection is not None:
        return _collection
    client = get_client()
    try:
        _collection = client.get_collection(COLLECTION_NAME)
        return _collection
    except Exception:
        if not create:
            raise
        _collection = client.create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine", "source": "fia_official"},
        )
        return _collection


def warm_rag() -> int:
    """Open Chroma + load embedding path so first user isn't cold."""
    knowledge_cache.clear()
    count = collection_count(force=True)
    if count > 0:
        # Prime embedding model with a tiny query
        try:
            search_regulations("red flag", n_results=1)
        except Exception:
            pass
    return count


def collection_count(force: bool = False) -> int:
    if not force:
        cached = knowledge_cache.get("count")
        if cached is not None:
            return cached
    try:
        n = int(get_collection(create=False).count())
    except Exception:
        try:
            n = int(get_collection(create=True).count())
        except Exception:
            n = 0
    knowledge_cache.set("count", n)
    return n


def chunk_id(doc_id: str, page: int, idx: int, text: str) -> str:
    digest = hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]
    return f"{doc_id}:p{page}:c{idx}:{digest}"


def upsert_chunks(
    ids: list[str],
    documents: list[str],
    metadatas: list[dict[str, Any]],
) -> int:
    global _collection
    if not ids:
        return 0
    _collection = None  # refresh handle after writes
    knowledge_cache.clear()
    rag_cache.clear()
    col = get_collection(create=True)
    batch = 64
    for i in range(0, len(ids), batch):
        col.upsert(
            ids=ids[i : i + batch],
            documents=documents[i : i + batch],
            metadatas=metadatas[i : i + batch],
        )
    knowledge_cache.clear()
    return len(ids)


def reset_collection() -> None:
    global _collection
    client = get_client()
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
    _collection = None
    knowledge_cache.clear()
    rag_cache.clear()
    get_collection(create=True)


def search_regulations(query: str, n_results: int = 6) -> list[dict[str, Any]]:
    n = max(1, min(n_results, 12))
    key = cache_key("rag", normalize_query(query), n)
    cached = rag_cache.get(key)
    if cached is not None:
        return cached

    col = get_collection(create=True)
    if col.count() == 0:
        return []
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
    rag_cache.set(key, out)
    return out
