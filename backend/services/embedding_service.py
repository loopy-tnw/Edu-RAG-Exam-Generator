"""
Embedding Service — Vector hóa và lưu bằng Numpy thay cho ChromaDB
SDK: google-genai (mới, thay thế google.generativeai đã deprecated)
Sử dụng: Google Gemini Embedding API + Numpy Cosine Similarity
"""
from google import genai
from google.genai import types
import os
import json
import asyncio
import numpy as np
import pickle
from typing import List, Dict, Any

api_key = os.getenv("GEMINI_API_KEY", "dummy_key")
client = genai.Client(api_key=api_key)

EMBED_MODEL = "gemini-embedding-001"

DB_PATH = "./numpy_db"
REGISTRY_PATH = os.path.join(DB_PATH, "documents_registry.json")
STORE_PATH = os.path.join(DB_PATH, "vector_store.pkl")

# In-memory vector store
_store = {
    "ids": [],
    "embeddings": [],
    "documents": [],
    "metadatas": [],
}

def _load_registry() -> Dict[str, Any]:
    if os.path.exists(REGISTRY_PATH):
        with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def _save_registry(registry: Dict[str, Any]):
    os.makedirs(DB_PATH, exist_ok=True)
    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)

def _load_store():
    global _store
    if os.path.exists(STORE_PATH):
        with open(STORE_PATH, "rb") as f:
            _store = pickle.load(f)

def _save_store():
    os.makedirs(DB_PATH, exist_ok=True)
    with open(STORE_PATH, "wb") as f:
        pickle.dump(_store, f)

# Tải database vào RAM khi module khởi chạy
_load_store()

def _embed_text(text: str) -> List[float]:
    """Gọi Gemini Embedding API (google-genai SDK mới) để vector hóa một đoạn text."""
    response = client.models.embed_content(
        model=EMBED_MODEL,
        contents=text,
        config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
    )
    return response.embeddings[0].values

def _cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    dot = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)

async def embed_and_store(doc_id: str, chunks: List[Dict[str, Any]], doc_metadata: Dict[str, Any]) -> int:
    """Vector hóa tất cả chunks và lưu vào Numpy DB."""
    global _store

    for i, chunk in enumerate(chunks):
        chunk_id = f"{doc_id}_chunk_{i}"
        # Chạy trong thread pool để không block event loop
        embedding = await asyncio.to_thread(_embed_text, chunk["text"])

        _store["ids"].append(chunk_id)
        _store["embeddings"].append(embedding)
        _store["documents"].append(chunk["text"])
        _store["metadatas"].append({
            "doc_id":     doc_id,
            "page":       chunk["page"],
            "subject":    doc_metadata.get("subject", ""),
            "grade":      doc_metadata.get("grade", ""),
            "docCategory":doc_metadata.get("docCategory", ""),
            "fileName":   doc_metadata.get("fileName", ""),
            "images":     json.dumps(chunk.get("images", [])),
        })

    _save_store()

    # Lưu registry
    import datetime
    registry = _load_registry()
    registry[doc_id] = {
        "id":         doc_id,
        "name":       doc_metadata.get("fileName", ""),
        "subject":    doc_metadata.get("subject", ""),
        "grade":      doc_metadata.get("grade", ""),
        "docCategory":doc_metadata.get("docCategory", ""),
        "fileSize":   doc_metadata.get("fileSize", ""),
        "chunkCount": len(chunks),
        "status":     "ready",
        "uploadedAt": datetime.datetime.utcnow().isoformat() + "Z",
    }
    _save_registry(registry)

    return len(chunks)

async def retrieve_chunks(
    query: str,
    grade: str = None,
    subject: str = None,
    n_results: int = 15,
) -> List[Dict[str, Any]]:
    """
    Truy xuất K chunks liên quan nhất từ Numpy DB theo Khối và Môn.
    """
    global _store
    if not _store["embeddings"]:
        return []

    # Chạy trong thread pool để không block event loop
    query_emb = np.array(await asyncio.to_thread(_embed_text, query))

    # Tính cosine similarity cho tất cả các vector
    all_embeddings = np.array(_store["embeddings"])

    norms = np.linalg.norm(all_embeddings, axis=1)
    q_norm = np.linalg.norm(query_emb)

    # Chống chia cho 0
    norms[norms == 0] = 1e-10
    q_norm = q_norm if q_norm != 0 else 1e-10

    similarities = np.dot(all_embeddings, query_emb) / (norms * q_norm)

    # Lọc theo grade và subject trước khi sort
    filtered_indices = []
    for i, meta in enumerate(_store["metadatas"]):
        if grade and meta.get("grade") != grade:
            continue
        if subject and meta.get("subject").lower() != subject.lower():
            continue
        filtered_indices.append(i)

    if not filtered_indices:
        return []

    # Sắp xếp các chỉ số đã lọc theo độ tương đồng giảm dần
    filtered_indices.sort(key=lambda i: similarities[i], reverse=True)

    # Lấy top K
    top_k_indices = filtered_indices[:n_results]

    chunks = []
    for i in top_k_indices:
        meta = _store["metadatas"][i]
        chunks.append({
            "text":     _store["documents"][i],
            "metadata": meta,
            "score":    float(similarities[i]),
            "images":   json.loads(meta.get("images", "[]")),
        })

    return chunks

async def get_all_documents() -> List[Dict[str, Any]]:
    """Trả về danh sách tài liệu từ registry."""
    registry = _load_registry()
    return list(registry.values())

async def get_document_count() -> int:
    return len(_load_registry())

async def delete_document_by_id(doc_id: str):
    """Xóa toàn bộ chunks của tài liệu và xóa khỏi registry."""
    global _store

    # Tìm các index không thuộc doc_id
    indices_to_keep = [i for i, meta in enumerate(_store["metadatas"]) if meta.get("doc_id") != doc_id]

    _store["ids"] = [_store["ids"][i] for i in indices_to_keep]
    _store["embeddings"] = [_store["embeddings"][i] for i in indices_to_keep]
    _store["documents"] = [_store["documents"][i] for i in indices_to_keep]
    _store["metadatas"] = [_store["metadatas"][i] for i in indices_to_keep]

    _save_store()

    # Xóa khỏi registry
    registry = _load_registry()
    registry.pop(doc_id, None)
    _save_registry(registry)
