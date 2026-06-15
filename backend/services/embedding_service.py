"""
Embedding Service — Vector hóa và lưu vào ChromaDB
Sử dụng: Google Gemini Embedding API + ChromaDB
"""
import chromadb
import google.generativeai as genai
import os
import json
from typing import List, Dict, Any

api_key = os.getenv("GEMINI_API_KEY", "dummy_key")
if api_key != "dummy_key":
    genai.configure(api_key=api_key)

# ChromaDB client (local persistent)
_chroma_client = chromadb.PersistentClient(path="./chroma_db")
_collection = _chroma_client.get_or_create_collection(
    name="edu_rag_documents",
    metadata={"hnsw:space": "cosine"},
)

# Registry lưu thông tin tài liệu (đơn giản dùng JSON file)
REGISTRY_PATH = "./chroma_db/documents_registry.json"


def _load_registry() -> Dict[str, Any]:
    if os.path.exists(REGISTRY_PATH):
        with open(REGISTRY_PATH) as f:
            return json.load(f)
    return {}


def _save_registry(registry: Dict[str, Any]):
    os.makedirs(os.path.dirname(REGISTRY_PATH), exist_ok=True)
    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)


def _embed_text(text: str) -> List[float]:
    """Gọi Gemini Embedding API để vector hóa một đoạn text."""
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type="retrieval_document",
    )
    return result["embedding"]


async def embed_and_store(doc_id: str, chunks: List[Dict[str, Any]], doc_metadata: Dict[str, Any]) -> int:
    """Vector hóa tất cả chunks và lưu vào ChromaDB."""
    ids, embeddings, documents, metadatas = [], [], [], []

    for i, chunk in enumerate(chunks):
        chunk_id = f"{doc_id}_chunk_{i}"
        embedding = _embed_text(chunk["text"])

        ids.append(chunk_id)
        embeddings.append(embedding)
        documents.append(chunk["text"])
        metadatas.append({
            "doc_id":     doc_id,
            "page":       chunk["page"],
            "subject":    doc_metadata.get("subject", ""),
            "grade":      doc_metadata.get("grade", ""),
            "examType":   doc_metadata.get("examType", ""),
            "difficulty": doc_metadata.get("difficulty", ""),
            "fileName":   doc_metadata.get("fileName", ""),
            "images":     json.dumps(chunk.get("images", [])),
        })

    if ids:
        _collection.add(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)

    # Lưu registry
    import datetime
    registry = _load_registry()
    registry[doc_id] = {
        "id":         doc_id,
        "name":       doc_metadata.get("fileName", ""),
        "subject":    doc_metadata.get("subject", ""),
        "grade":      doc_metadata.get("grade", ""),
        "examType":   doc_metadata.get("examType", ""),
        "difficulty": doc_metadata.get("difficulty", ""),
        "fileSize":   doc_metadata.get("fileSize", ""),
        "chunkCount": len(chunks),
        "status":     "ready",
        "uploadedAt": datetime.datetime.utcnow().isoformat() + "Z",
    }
    _save_registry(registry)

    return len(chunks)


async def retrieve_chunks(
    query: str,
    doc_ids: List[str],
    n_results: int = 8,
    difficulty_filter: List[str] = None,
) -> List[Dict[str, Any]]:
    """
    Truy xuất K chunks liên quan nhất từ ChromaDB.
    Lọc theo doc_id và tùy chọn theo mức độ.
    """
    query_embedding = _embed_text(query)

    # Build where clause
    where = {"doc_id": {"$in": doc_ids}}
    if difficulty_filter:
        where["difficulty"] = {"$in": difficulty_filter}

    results = _collection.query(
        query_embeddings=[query_embedding],
        n_results=min(n_results, _collection.count()),
        where=where,
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    for text, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        chunks.append({
            "text":     text,
            "metadata": meta,
            "score":    1 - dist,   # cosine similarity
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
    # Lấy tất cả chunk IDs thuộc doc_id
    results = _collection.get(where={"doc_id": doc_id}, include=[])
    if results["ids"]:
        _collection.delete(ids=results["ids"])

    # Xóa khỏi registry
    registry = _load_registry()
    registry.pop(doc_id, None)
    _save_registry(registry)
