# 📚 Edu-RAG — AI Exam Generator từ Tài liệu Học tập

> Hệ thống sinh đề thi tự động dựa trên kỹ thuật **Retrieval-Augmented Generation (RAG)**, cho phép giáo viên tạo đề thi **chỉ từ chính tài liệu của mình** — không ảo tưởng, không ngoài phạm vi chương trình.

![Status](https://img.shields.io/badge/status-in--development-yellow)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🎯 Vấn đề & Giải pháp

### Vấn đề

Giáo viên mất trung bình **2–5 giờ** để soạn một đề thi chuẩn. Ngoài ra:

- Sử dụng ChatGPT / Gemini thông thường → AI **tự bịa kiến thức** (Hallucination), sinh câu hỏi ngoài phạm vi chương trình.
- Soạn thủ công → dễ trùng lặp, thiếu tính logic ở phương án nhiễu (distractors).

### Giải pháp

Xây dựng một hệ thống **RAG khép kín**: AI chỉ được phép truy xuất và sinh câu hỏi từ **kho tài liệu PDF mà giáo viên tự cung cấp**, kết hợp kỹ thuật **Self-RAG** để tự phản biện và loại bỏ câu hỏi ảo tưởng trước khi trả về.

---

## ✨ Tính năng chính

| Tính năng | Mô tả |
|---|---|
| 🗂️ **Ngân hàng Tài liệu** | Upload PDF, phân loại theo Khối · Lớp · Dạng đề · Mức độ |
| 🔍 **RAG Retrieval** | Tìm kiếm ngữ nghĩa (Cosine Similarity) trên Vector DB để lấy đúng đoạn tài liệu liên quan |
| 🤖 **LLM Sinh câu hỏi** | Sinh câu Trắc nghiệm (A/B/C/D) và Tự luận kèm phương án nhiễu thông minh |
| 🧐 **Self-RAG Critique** | LLM tự phản biện — câu hỏi không có nguồn gốc trong tài liệu sẽ bị sinh lại tự động |
| 🖼️ **Multimodal PDF** | Trích xuất và đính kèm hình ảnh, biểu đồ, hình hình học trực tiếp từ PDF vào câu hỏi |
| ✏️ **Human-in-the-Loop** | Giáo viên xem trước, chỉnh sửa trực tiếp, yêu cầu đổi câu, chat với AI |
| 📄 **Xuất file chuẩn** | Xuất `.docx` / `.pdf` đúng chuẩn định dạng Bộ Giáo dục & Đào tạo (Times New Roman, bảng đáp án) |

---

## 🏗️ Kiến trúc hệ thống

Hệ thống được tổ chức thành **2 luồng xử lý độc lập**:

```
┌─────────────────────────────────────────────────────────┐
│           LUỒNG 1: Quản lý Ngân hàng Tài liệu          │
│                                                         │
│  Upload PDF → Trích xuất Text+Ảnh → Chunking           │
│  → Embedding → Gắn Metadata → Lưu Vector DB            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│           LUỒNG 2: Tạo đề thi tự động (RAG)            │
│                                                         │
│  Chọn tài liệu → Cấu hình → Retrieve Context          │
│  → LLM Sinh đề → Self-RAG Critique                     │
│  → Preview & Chỉnh sửa → Xuất Word/PDF                 │
└─────────────────────────────────────────────────────────┘
```

### Sơ đồ kỹ thuật

```
[Giáo viên]
     │
     ▼
[Web UI - Next.js]
     │  POST /generate-exam
     ▼
[Backend API - FastAPI/Python]
     │
     ├──► [Vector DB - ChromaDB]  ◄── (Metadata filter: Khối/Lớp/Dạng/Mức độ)
     │         │ Top-K Chunks
     │         ▼
     └──► [LLM - Gemini / GPT-4o]
               │ Sinh câu hỏi
               ▼
          [Self-RAG Critique]
               │ Hợp lệ
               ▼
          [Trả về UI] → [Xuất docx/pdf]
```

---

## 🛠️ Tech Stack

| Layer | Công nghệ |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS |
| **Backend** | Python, FastAPI *(đang phát triển)* |
| **AI / LLM** | Google Gemini / OpenAI GPT-4o |
| **Vector DB** | ChromaDB |
| **PDF Processing** | PyMuPDF (`fitz`), LayoutParser |
| **Embedding** | Sentence Transformers / OpenAI Embeddings |
| **Export** | `python-docx`, `docx` (Node.js) |

---

## 📁 Cấu trúc thư mục

```
Mini PJ1/
├── frontend/                  # Giao diện web (Next.js)
│   ├── src/
│   │   └── app/
│   │       ├── page.tsx       # Trang chủ
│   │       ├── layout.tsx     # Layout chung
│   │       └── globals.css    # CSS toàn cục
│   ├── package.json
│   └── next.config.ts
│
├── backend/                   # API server (Python - đang phát triển)
│
├── generate_word_node.js      # Script xuất file .docx (Node.js)
├── generate_word_template.py  # Script xuất file .docx (Python)
├── DataFlow                   # Mô tả luồng xử lý dữ liệu RAG Pipeline
├── mota.md                    # Mô tả chi tiết dự án & nghiên cứu nền tảng
└── README.md
```

---

## 🚀 Hướng dẫn chạy (Development)

### Yêu cầu

- Node.js >= 18
- Python >= 3.10
- API Key: Google Gemini hoặc OpenAI

### Chạy Frontend

```bash
cd frontend
npm install
npm run dev
# Truy cập: http://localhost:3000
```

### Chạy Backend *(sắp cập nhật)*

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# API: http://localhost:8000
```

---

## 📐 Thiết kế hệ thống

Chi tiết các sơ đồ Use Case, Activity (Swimlane) và Sequence Diagram được lưu tại:
[`system_diagrams.md`](./system_diagrams.md) *(trong thư mục tài liệu dự án)*

### Nguyên tắc cốt lõi

> ⚠️ **Strict Context-Grounding**: Mọi câu hỏi được sinh ra **bắt buộc** phải có nguồn gốc trực tiếp từ tài liệu gốc. Hệ thống áp dụng tư tưởng của nghiên cứu **Self-RAG** (Asai et al., 2023) để tự động phát hiện và loại bỏ ảo tưởng.

---

## 📚 Tài liệu tham khảo

1. **Self-RAG**: Asai, A., Wu, Z., Wang, Y., Pang, C., & Hajishirzi, H. (2023). *Self-RAG: Learning to Retrieve, Generate, and Critique with Self-Reflection.* arXiv:2310.11511.
2. **Multimodal PDF**: LayoutParser — thư viện phân tích cấu trúc tài liệu số, giữ nguyên bảng biểu & hình ảnh.
3. **Distractor Generation**: Kỹ thuật dùng các khái niệm từ các chương khác trong cùng tài liệu làm phương án nhiễu.

---

## 👤 Tác giả

- **Nguyễn Thúy Ngân** — Nghiên cứu & Phát triển
- Dự án: Edu-RAG Exam Generator

---

## 📄 License

MIT License — Xem file [LICENSE](./LICENSE) để biết thêm.
