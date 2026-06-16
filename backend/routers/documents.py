import uuid
import os
import json
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Literal
from services.pdf_service import process_pdf
from services.embedding_service import embed_and_store, get_all_documents, delete_document_by_id

router = APIRouter()

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    metadata: str = Form(...),
):
    """Upload PDF, trích xuất nội dung, vector hóa và lưu vào Numpy DB."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file PDF.")

    try:
        meta_dict = json.loads(metadata)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Metadata không hợp lệ.")

    doc_id = str(uuid.uuid4())

    # Lưu file tạm
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{doc_id}.pdf")
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    meta_dict["fileName"] = file.filename
    meta_dict["fileSize"] = f"{len(content) / 1024 / 1024:.2f} MB"

    # Xử lý PDF → chunks → embeddings → Numpy DB
    chunks = await process_pdf(file_path, meta_dict)
    chunk_count = await embed_and_store(doc_id, chunks, meta_dict)

    return {
        "id":         doc_id,
        "name":       file.filename,
        "subject":    meta_dict.get("subject", ""),
        "grade":      meta_dict.get("grade", ""),
        "docCategory":meta_dict.get("docCategory", ""),
        "status":     "ready",
        "fileSize":   meta_dict["fileSize"],
        "chunkCount": chunk_count,
        "uploadedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
    }

@router.get("")
async def list_documents():
    """Lấy danh sách tất cả tài liệu đã upload."""
    return await get_all_documents()

@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """Xóa tài liệu và toàn bộ chunks của nó khỏi Numpy DB."""
    await delete_document_by_id(doc_id)
    return {"message": "Đã xóa tài liệu thành công."}
