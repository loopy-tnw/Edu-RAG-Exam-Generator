// ═══════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════

export type GradeLevel = "Lớp 6" | "Lớp 7" | "Lớp 8" | "Lớp 9";
export type DocCategory = "Sách giáo khoa" | "Sách nâng cao" | "Đề thi";
export type QuestionType = "Trắc nghiệm" | "Tự luận";
export type DocumentStatus = "processing" | "ready" | "error";

export interface Document {
  id: string;
  name: string;
  subject: string;
  grade: GradeLevel;
  docCategory: DocCategory;
  uploadedAt: string;
  status: DocumentStatus;
  fileSize: string;
  chunkCount: number;
}

export interface ExamConfig {
  grade: GradeLevel;
  subject: string;
  topicPrompt: string;    // Yêu cầu (chương, bài...)
  totalQuestions: number;
  mcqCount: number;       // Trắc nghiệm
  essayCount: number;     // Tự luận
  examTitle: string;
  duration: number;       // phút
  schoolName: string;
  schoolYear: string;
}

export interface Option {
  key: "A" | "B" | "C" | "D";
  text: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  options?: Option[];      // Chỉ có với Trắc nghiệm
  answer: string;          // Đáp án đúng
  explanation?: string;    // Lời giải
  sourceChunk?: string;    // Đoạn tài liệu gốc
  points: number;
}

export interface GeneratedExam {
  id: string;
  title: string;
  config: ExamConfig;
  questions: Question[];
  createdAt: string;
  usedFallback?: boolean; // BUG-06: true khi không có tài liệu khớp → dùng kiến thức chung
}

// ═══════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: "doc-1",
    name: "sgk-toan-6-tap-1.pdf",
    subject: "Toán",
    grade: "Lớp 6",
    docCategory: "Sách giáo khoa",
    uploadedAt: "2026-06-10T08:30:00Z",
    status: "ready",
    fileSize: "15.9 MB",
    chunkCount: 248,
  },
  {
    id: "doc-2",
    name: "nang-cao-toan-8-tap-1.pdf",
    subject: "Toán",
    grade: "Lớp 8",
    docCategory: "Sách nâng cao",
    uploadedAt: "2026-06-11T10:00:00Z",
    status: "ready",
    fileSize: "4.67 MB",
    chunkCount: 132,
  },
  {
    id: "doc-3",
    name: "de-thi-hk1-toan-9.pdf",
    subject: "Toán",
    grade: "Lớp 9",
    docCategory: "Đề thi",
    uploadedAt: "2026-06-12T14:20:00Z",
    status: "processing",
    fileSize: "2.1 MB",
    chunkCount: 0,
  },
];

export const MOCK_QUESTIONS: Question[] = [
  {
    id: "q-1",
    type: "Trắc nghiệm",
    content: "Biểu thức √(x − 2) xác định khi và chỉ khi:",
    options: [
      { key: "A", text: "x > 2" },
      { key: "B", text: "x ≥ 2" },
      { key: "C", text: "x < 2" },
      { key: "D", text: "x ≤ 2" },
    ],
    answer: "B",
    explanation: "Biểu thức √(x − 2) xác định khi x − 2 ≥ 0, tức là x ≥ 2.",
    sourceChunk: "Điều kiện xác định của căn thức bậc hai: √A xác định khi A ≥ 0.",
    points: 0.25,
  },
  {
    id: "q-2",
    type: "Trắc nghiệm",
    content: "Hàm số y = (m − 1)x + 3 đồng biến trên ℝ khi:",
    options: [
      { key: "A", text: "m > 1" },
      { key: "B", text: "m < 1" },
      { key: "C", text: "m ≥ 1" },
      { key: "D", text: "m ≠ 1" },
    ],
    answer: "A",
    explanation: "Hàm số y = ax + b đồng biến khi a > 0. Ở đây a = m − 1 > 0 ⟹ m > 1.",
    sourceChunk: "Hàm số bậc nhất y = ax + b (a ≠ 0): đồng biến nếu a > 0, nghịch biến nếu a < 0.",
    points: 0.25,
  },
  {
    id: "q-3",
    type: "Trắc nghiệm",
    content: "Phương trình x² − 5x + 6 = 0 có hai nghiệm là:",
    options: [
      { key: "A", text: "x = 1; x = 6" },
      { key: "B", text: "x = 2; x = 3" },
      { key: "C", text: "x = −2; x = −3" },
      { key: "D", text: "x = 1; x = −6" },
    ],
    answer: "B",
    explanation: "Δ = 25 − 24 = 1 > 0. x₁ = (5+1)/2 = 3; x₂ = (5−1)/2 = 2.",
    sourceChunk: "Phương trình bậc hai ax² + bx + c = 0 có nghiệm khi Δ = b² − 4ac ≥ 0.",
    points: 0.25,
  },
  {
    id: "q-4",
    type: "Tự luận",
    content: "Giải hệ phương trình:\n(1) 2x + y = 5\n(2) x − 3y = −1",
    answer: "x = 2; y = 1",
    explanation: "Từ (1): y = 5 − 2x. Thay vào (2): x − 3(5−2x) = −1 ⟹ 7x = 14 ⟹ x = 2, y = 1.",
    sourceChunk: "Hệ phương trình bậc nhất hai ẩn được giải bằng phương pháp thế hoặc cộng đại số.",
    points: 2.0,
  },
];

// ═══════════════════════════════════════════
// API CLIENT (mock → real khi backend sẵn)
// ═══════════════════════════════════════════

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"; // false by default
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Helper: fetch + kiểm tra HTTP status. Throw lỗi rõ ràng nếu server trả 4xx/5xx. */
async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (!res.ok) {
    let errMsg = `Lỗi HTTP ${res.status}`;
    try {
      const body = await res.json();
      errMsg = body.detail || body.error || errMsg;
    } catch {
      errMsg = (await res.text()) || errMsg;
    }
    throw new Error(errMsg);
  }
  return res;
}

// ── Documents ──────────────────────────────

export async function getDocuments(): Promise<Document[]> {
  if (USE_MOCK) {
    await delay(500);
    return MOCK_DOCUMENTS;
  }
  const res = await apiFetch(`${API_BASE}/documents`);
  return res.json();
}

export async function uploadDocument(
  file: File,
  metadata: {
    subject: string;
    grade: GradeLevel;
    docCategory: DocCategory;
  }
): Promise<Document> {
  if (USE_MOCK) {
    await delay(2000); // giả lập xử lý PDF
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      name: file.name,
      ...metadata,
      uploadedAt: new Date().toISOString(),
      status: "ready",
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      chunkCount: Math.floor(Math.random() * 60) + 20,
    };
    return newDoc;
  }
  const form = new FormData();
  form.append("file", file);
  form.append("metadata", JSON.stringify(metadata));
  const res = await apiFetch(`${API_BASE}/documents/upload`, { method: "POST", body: form });
  return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  if (USE_MOCK) { await delay(300); return; }
  await apiFetch(`${API_BASE}/documents/${id}`, { method: "DELETE" });
}

// ── Exam Generation ────────────────────────

export async function generateExam(config: ExamConfig): Promise<GeneratedExam> {
  if (USE_MOCK) {
    await delay(3000); // giả lập thời gian RAG + LLM
    return {
      id: `exam-${Date.now()}`,
      title: config.examTitle || "Đề thi sinh tự động",
      config,
      questions: MOCK_QUESTIONS,
      createdAt: new Date().toISOString(),
    };
  }
  const res = await apiFetch(`${API_BASE}/exams/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return res.json();
}

export async function exportExam(
  exam: GeneratedExam,
  format: "docx" | "pdf"
): Promise<Blob> {
  // Đã chuyển tính năng xuất file sang Node.js chạy trực tiếp trên Frontend (Next.js)
  const res = await fetch(`/api/exams/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exam, format }),
  });
  
  if (!res.ok) {
    throw new Error("Lỗi xuất file Word từ Next.js API.");
  }
  
  return res.blob();
}

// ── Stats (Dashboard) ──────────────────────

export interface DashboardStats {
  totalDocuments: number;
  totalExams: number;
  totalQuestions: number;
  lastActivity: string;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (USE_MOCK) {
    await delay(300);
    return {
      totalDocuments: MOCK_DOCUMENTS.filter((d) => d.status === "ready").length,
      totalExams: 5,
      totalQuestions: 62,
      lastActivity: new Date().toISOString(),
    };
  }
  const res = await apiFetch(`${API_BASE}/stats`);
  return res.json();
}
