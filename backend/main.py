from dotenv import load_dotenv
load_dotenv()  # Phải load trước khi import các service (embedding/rag dùng os.getenv ngay khi khởi tạo)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import documents, exams

app = FastAPI(
    title="Edu-RAG API",
    description="Backend API cho hệ thống sinh đề thi tự động từ tài liệu học tập.",
    version="1.0.0",
)

# ── CORS (cho phép Next.js gọi API) ──────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────
app.include_router(documents.router, prefix="/api/documents", tags=["Tài liệu"])
app.include_router(exams.router,     prefix="/api/exams",     tags=["Đề thi"])


@app.get("/api/stats", tags=["Dashboard"])
async def get_stats():
    """Thống kê tổng quan cho Dashboard."""
    from services.embedding_service import get_document_count
    count = await get_document_count()
    return {
        "totalDocuments": count,
        "totalExams": 0,
        "totalQuestions": 0,
        "lastActivity": None,
    }


@app.get("/", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "Edu-RAG API"}
