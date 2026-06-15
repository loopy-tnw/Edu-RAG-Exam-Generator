import uuid
import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Literal
from services.pdf_service import process_pdf
from services.embedding_service import embed_and_store, get_all_documents, delete_document_by_id

router = APIRouter()

GradeLevel  = Literal["Lớp 10", "Lớp 11", "Lớp 12", "THCS", "Tiểu học"]
ExamType    = Literal["Kiểm tra 15p", "Kiểm tra 1 tiết", "Học kỳ", "Tuyển sinh", "Ôn tập"]
Difficulty  = Literal["Nhận biết", "Thông hiểu", "Vận dụng", "Vận dụng cao"]


class DocumentMeta(BaseModel):
    subject:    str
    grade:      GradeLevel
    examType:   ExamType
    difficulty: Difficulty


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    subject:    str = Form(...),
    grade:      str = Form(...),
    examType:   str = Form(...),
    difficulty: str = Form(...),
):
    """Upload PDF, trích xuất nội dung, vector hóa và lưu vào ChromaDB."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file PDF.")

    doc_id = str(uuid.uuid4())

    # Lưu file tạm
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{doc_id}.pdf")
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    metadata = {
        "subject":    subject,
        "grade":      grade,
        "examType":   examType,
        "difficulty": difficulty,
        "fileName":   file.filename,
        "fileSize":   f"{len(content) / 1024 / 1024:.2f} MB",
    }

    # Xử lý PDF → chunks → embeddings → ChromaDB
    chunks = await process_pdf(file_path, metadata)
    chunk_count = await embed_and_store(doc_id, chunks, metadata)

    return {
        "id":         doc_id,
        "name":       file.filename,
        "subject":    subject,
        "grade":      grade,
        "examType":   examType,
        "difficulty": difficulty,
        "status":     "ready",
        "fileSize":   metadata["fileSize"],
        "chunkCount": chunk_count,
        "uploadedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
    }


@router.get("")
async def list_documents():
    """Lấy danh sách tất cả tài liệu đã upload."""
    return await get_all_documents()


@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """Xóa tài liệu và toàn bộ chunks của nó khỏi ChromaDB."""
    await delete_document_by_id(doc_id)
    return {"message": "Đã xóa tài liệu thành công."}
