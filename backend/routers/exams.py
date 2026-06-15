from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import io
from services.rag_service import generate_exam_questions
from services.export_service import build_docx

router = APIRouter()


class ExamConfigRequest(BaseModel):
    documentIds:     List[str]
    totalQuestions:  int
    mcqCount:        int
    essayCount:      int
    difficulty:      List[str]
    subject:         str
    examTitle:       str
    duration:        int
    schoolName:      str
    schoolYear:      str


class OptionModel(BaseModel):
    key:  str
    text: str


class QuestionModel(BaseModel):
    id:          str
    type:        str
    content:     str
    options:     Optional[List[OptionModel]] = None
    answer:      str
    explanation: Optional[str] = None
    sourceChunk: Optional[str] = None
    points:      float


class ExportRequest(BaseModel):
    exam:   dict
    format: str  # "docx" | "pdf"


@router.post("/generate")
async def generate_exam(config: ExamConfigRequest):
    """
    RAG Pipeline: Truy xuất context → LLM sinh câu hỏi → Self-RAG Critique.
    Trả về danh sách câu hỏi đã kiểm định.
    """
    if not config.documentIds:
        raise HTTPException(status_code=400, detail="Phải chọn ít nhất 1 tài liệu.")
    if config.mcqCount + config.essayCount == 0:
        raise HTTPException(status_code=400, detail="Tổng số câu phải lớn hơn 0.")

    questions = await generate_exam_questions(config.dict())

    return {
        "id":         __import__("uuid").uuid4().hex,
        "title":      config.examTitle or f"Đề {config.subject} — {config.schoolYear}",
        "config":     config.dict(),
        "questions":  questions,
        "createdAt":  __import__("datetime").datetime.utcnow().isoformat() + "Z",
    }


@router.post("/export")
async def export_exam(req: ExportRequest):
    """Xuất đề thi thành file .docx theo chuẩn Bộ GD&ĐT."""
    if req.format not in ("docx", "pdf"):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ định dạng docx và pdf.")

    exam  = req.exam
    docx_bytes = build_docx(exam)

    filename = f"{exam.get('title', 'de_thi')}.docx"
    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
