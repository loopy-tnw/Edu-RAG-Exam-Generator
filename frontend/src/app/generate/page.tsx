"use client";

import { useEffect, useState } from "react";
import {
  getDocuments, generateExam, exportExam,
  type Document, type ExamConfig, type GeneratedExam, type Question,
  type DifficultyLevel,
} from "@/lib/api";

// ── Step Indicator ──────────────────────────────────────────────────────
const STEPS = ["Phạm vi kiến thức", "Cấu hình đề", "Xem & Chỉnh sửa", "Xuất file"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="step-indicator" style={{ marginBottom: 32 }}>
      {STEPS.map((label, i) => {
        const state = i < current ? "completed" : i === current ? "active" : "";
        return (
          <div key={i} className={`step-item ${state}`}>
            <div className="step-dot">
              {i < current ? "✓" : i + 1}
            </div>
            <span className="step-label">{label}</span>
            {i < STEPS.length - 1 && (
              <div style={{
                width: 40, height: 1, margin: "0 8px", flexShrink: 0,
                background: i < current ? "var(--brand-600)" : "var(--border-default)",
                transition: "background 0.3s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Phạm vi kiến thức ───────────────────────────────────────────────
function Step1({
  config, onChange, onNext,
}: {
  config: Partial<ExamConfig>;
  onChange: (c: Partial<ExamConfig>) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ color: "var(--text-primary)", marginBottom: 4 }}>
          Chọn phạm vi kiến thức
        </h3>
        <p style={{ fontSize: 14, marginBottom: 20 }}>
          Hệ thống sẽ dựa vào Khối, Môn học và Yêu cầu cụ thể của bạn để tự động tìm kiếm kiến thức trong Ngân hàng SGK/Tài liệu tương ứng.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="grid-2">
            <div>
              <label className="form-label">Khối / Lớp</label>
              <select className="form-select" value={config.grade ?? "Lớp 6"}
                onChange={(e) => onChange({ ...config, grade: e.target.value as any })}>
                {["Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9"].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Môn học</label>
              <input className="form-input" placeholder="VD: Toán, Văn, Lý..."
                value={config.subject ?? ""}
                onChange={(e) => onChange({ ...config, subject: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label">Yêu cầu chi tiết (Chủ đề / Chương bài)</label>
            <textarea className="form-textarea" rows={4}
              placeholder="VD: Tạo đề kiểm tra Chương 1: Số hữu tỉ. Tập trung vào các bài toán cộng trừ nhân chia và tìm x."
              value={config.topicPrompt ?? ""}
              onChange={(e) => onChange({ ...config, topicPrompt: e.target.value })} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          className="btn btn-primary"
          disabled={!config.subject || !config.topicPrompt}
          onClick={onNext}
        >
          Tiếp theo: Cấu hình đề →
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Cấu hình đề thi ─────────────────────────────────────────────

function Step2({
  config, onChange, onBack, onGenerate, generating,
}: {
  config: Partial<ExamConfig>;
  onChange: (c: Partial<ExamConfig>) => void;
  onBack: () => void;
  onGenerate: () => void;
  generating: boolean;
}) {
  const total = (config.mcqCount ?? 0) + (config.essayCount ?? 0);

  return (
    <div>
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ color: "var(--text-primary)", marginBottom: 18 }}>Thông tin đề thi</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="grid-2">
            <div>
              <label className="form-label">Tên đề thi</label>
              <input className="form-input" placeholder="VD: Đề kiểm tra cuối kỳ Toán 10"
                value={config.examTitle ?? ""}
                onChange={(e) => onChange({ ...config, examTitle: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Tên trường / Đơn vị</label>
              <input className="form-input" placeholder="VD: Trường THPT Nguyễn Trãi"
                value={config.schoolName ?? ""}
                onChange={(e) => onChange({ ...config, schoolName: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Năm học</label>
              <input className="form-input" placeholder="VD: 2026 - 2027"
                value={config.schoolYear ?? ""}
                onChange={(e) => onChange({ ...config, schoolYear: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Thời gian làm bài (phút)</label>
              <input className="form-input" type="number" min={15} max={180}
                value={config.duration ?? 90}
                onChange={(e) => onChange({ ...config, duration: Number(e.target.value) })} />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ color: "var(--text-primary)", marginBottom: 18 }}>Cấu trúc câu hỏi</h3>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div>
            <label className="form-label">Số câu Trắc nghiệm</label>
            <input className="form-input" type="number" min={0} max={40}
              value={config.mcqCount ?? 12}
              onChange={(e) => onChange({ ...config, mcqCount: Number(e.target.value) })} />
          </div>
          <div>
            <label className="form-label">Số câu Tự luận</label>
            <input className="form-input" type="number" min={0} max={10}
              value={config.essayCount ?? 3}
              onChange={(e) => onChange({ ...config, essayCount: Number(e.target.value) })} />
          </div>
        </div>

        <div style={{
          marginTop: 20, padding: "14px 16px",
          background: "rgba(99,102,241,0.08)", border: "1px solid var(--border-brand)",
          borderRadius: "var(--radius-md)", fontSize: 14, color: "var(--text-secondary)",
        }}>
          💡 AI sẽ tự động phân tích <strong>{config.topicPrompt || "yêu cầu của bạn"}</strong> và phân bố các câu hỏi theo 4 mức độ: Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao.
        </div>

        {/* Summary */}
        <div style={{
          marginTop: 20, padding: "14px 16px",
          background: "rgba(99,102,241,0.08)", border: "1px solid var(--border-brand)",
          borderRadius: "var(--radius-md)", fontSize: 14, color: "var(--text-secondary)",
        }}>
          📊 Tổng: <strong style={{ color: "var(--text-primary)" }}>{total} câu</strong>
          {" "}({config.mcqCount ?? 12} TN + {config.essayCount ?? 3} TL)
          {" "}· Thời gian: <strong style={{ color: "var(--text-primary)" }}>{config.duration ?? 90} phút</strong>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button className="btn btn-secondary" onClick={onBack}>← Quay lại</button>
        <button className="btn btn-primary btn-lg" onClick={onGenerate} disabled={generating}>
          {generating
            ? <><span className="spinner" style={{ width: 16, height: 16 }} />  AI đang sinh đề...</>
            : "✨ Sinh đề thi ngay"}
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Xem & Chỉnh sửa ────────────────────────────────────────────
function Step3({
  exam, onUpdate, onBack, onNext,
}: {
  exam: GeneratedExam;
  onUpdate: (q: Question[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>(exam.questions);

  const updateQuestion = (id: string, field: keyof Question, value: string) => {
    const updated = questions.map((q) => q.id === id ? { ...q, [field]: value } : q);
    setQuestions(updated);
    onUpdate(updated);
  };

  return (
    <div>
      {/* BUG-06: Cảnh báo khi đề dùng kiến thức chung */}
      {exam.usedFallback && (
        <div style={{
          marginBottom: 16, padding: "12px 16px",
          background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.4)",
          borderRadius: "var(--radius-md)", fontSize: 14, color: "#b45309",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span>
            <strong>Không tìm thấy tài liệu khớp.</strong>
            {" "}Hệ thống đã sinh đề tự dựa vào kiến thức chung của SGK — không phải từ tài liệu bạn upload.
            {" "}Để có kết quả tốt hơn, hãy upload tài liệu đúng môn và đúng khối trước khi sinh đề.
          </span>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ color: "var(--text-primary)" }}>{exam.title}</h2>
          <p style={{ fontSize: 14 }}>
            {questions.length} câu hỏi · Nhấn vào câu bất kỳ để chỉnh sửa
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <span className="badge badge-success">✓ Self-RAG đã kiểm định</span>
          <span className="badge badge-brand">{questions.filter(q => q.type === "Trắc nghiệm").length} TN</span>
          <span className="badge badge-brand">{questions.filter(q => q.type === "Tự luận").length} TL</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className={`question-card ${editingId === q.id ? "editing" : ""}`}
            onClick={() => setEditingId(editingId === q.id ? null : q.id)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div className="question-number">
                {q.type === "Trắc nghiệm" ? "🔵" : "📝"} Câu {idx + 1} · {q.type}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: "4px 8px", fontSize: 12 }}
                  onClick={(e) => { e.stopPropagation(); setEditingId(q.id); }}
                >✏️ Sửa</button>
              </div>
            </div>

            {editingId === q.id ? (
              <div onClick={(e) => e.stopPropagation()}>
                <label className="form-label">Nội dung câu hỏi</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  style={{ marginBottom: 12, resize: "vertical" }}
                  value={q.content}
                  onChange={(e) => updateQuestion(q.id, "content", e.target.value)}
                />
                {q.options && (
                  <div style={{ marginBottom: 12 }}>
                    <label className="form-label">Các phương án</label>
                    {q.options.map((opt) => (
                      <div key={opt.key} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                        <span style={{
                          width: 28, height: 28, borderRadius: "50%", display: "flex",
                          alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
                          background: opt.key === q.answer ? "rgba(34,197,94,0.15)" : "var(--bg-hover)",
                          color: opt.key === q.answer ? "var(--success)" : "var(--text-muted)",
                          border: `1px solid ${opt.key === q.answer ? "rgba(34,197,94,0.3)" : "var(--border-subtle)"}`,
                          flexShrink: 0,
                        }}>
                          {opt.key}
                        </span>
                        <input className="form-input" style={{ flex: 1 }} value={opt.text}
                          onChange={(e) => {
                            const newOpts = q.options!.map(o => o.key === opt.key ? { ...o, text: e.target.value } : o);
                            const updated = questions.map(qu => qu.id === q.id ? { ...qu, options: newOpts } : qu);
                            setQuestions(updated); onUpdate(updated);
                          }} />
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid-2">
                  <div style={{ gridColumn: "span 2" }}>
                    <label className="form-label">Đáp án đúng</label>
                    <input className="form-input" value={q.answer}
                      onChange={(e) => updateQuestion(q.id, "answer", e.target.value)} />
                  </div>
                </div>
                {q.sourceChunk && (
                  <div style={{
                    marginTop: 12, padding: "10px 12px", background: "rgba(99,102,241,0.06)",
                    border: "1px solid var(--border-brand)", borderRadius: "var(--radius-md)",
                    fontSize: 12, color: "var(--text-muted)",
                  }}>
                    <span style={{ fontWeight: 600, color: "var(--brand-400)" }}>📌 Nguồn gốc: </span>
                    {q.sourceChunk}
                  </div>
                )}
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}
                  onClick={() => setEditingId(null)}>
                  Đóng
                </button>
              </div>
            ) : (
              <>
                <div className="question-text">{q.content}</div>
                {q.options && (
                  <div className="options-list">
                    {q.options.map((opt) => (
                      <div key={opt.key} className={`option-item ${opt.key === q.answer ? "correct" : ""}`}>
                        <span className="option-letter">{opt.key}.</span>
                        {opt.text}
                        {opt.key === q.answer && <span style={{ marginLeft: "auto", fontSize: 12 }}>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button className="btn btn-secondary" onClick={onBack}>← Cấu hình lại</button>
        <button className="btn btn-primary btn-lg" onClick={onNext}>
          📄 Tiếp tục xuất file →
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Xuất file ──────────────────────────────────────────────────
function Step4({ exam, onBack }: { exam: GeneratedExam; onBack: () => void }) {
  const [exporting, setExporting] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);

  const handleExportDocx = async () => {
    setExporting(true);
    try {
      const blob = await exportExam(exam, "docx");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${exam.title}.docx`; a.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ textAlign: "center", padding: "48px 32px", marginBottom: 24 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 style={{ color: "var(--text-primary)", marginBottom: 8 }}>Đề thi đã sẵn sàng!</h2>
        <p style={{ marginBottom: 32, maxWidth: 480, margin: "0 auto 32px" }}>
          <strong style={{ color: "var(--text-primary)" }}>{exam.title}</strong>
          {" "}với {exam.questions.length} câu hỏi đã được kiểm định bởi Self-RAG.
          Chọn định dạng để tải xuống.
        </p>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 360, margin: "0 auto" }}>
          {/* Nút DOCX — hoạt động */}
          <button
            className="btn btn-primary btn-lg"
            style={{ justifyContent: "center", width: "100%" }}
            onClick={handleExportDocx}
            disabled={exporting}
          >
            {exporting
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Đang tạo...</>
              : <>{done ? "✅" : "📝"} Tải xuống .docx</>}
          </button>

          {/* Nút PDF — BUG-05 FIX: chưa hỗ trợ, hiển thị rõ thùng báo thay vì trả file sai */}
          <div style={{ position: "relative", width: "100%" }}>
            <button
              className="btn btn-secondary btn-lg"
              style={{ justifyContent: "center", width: "100%", opacity: 0.5, cursor: "not-allowed" }}
              disabled
              title="Tính năng đang được phát triển"
            >
              📄 Xuất PDF
            </button>
            <span style={{
              position: "absolute", top: -8, right: -8,
              background: "rgba(251,191,36,0.9)", color: "#78350f",
              fontSize: 10, fontWeight: 700, padding: "2px 6px",
              borderRadius: 99,
            }}>Sắp ra mắt</span>
          </div>
        </div>

        {done && (
          <div style={{
            marginTop: 24, padding: "12px 20px",
            background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: "var(--radius-md)", display: "inline-block",
            fontSize: 14, color: "var(--success)",
          }}>
            ✅ Đã tải xuống file .{done} thành công!
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button className="btn btn-secondary" onClick={onBack}>← Chỉnh sửa lại</button>
        <button className="btn btn-ghost" onClick={() => window.location.reload()}>
          ✨ Tạo đề mới
        </button>
      </div>
    </div>
  );
}

// ── MAIN PAGE ───────────────────────────────────────────────────────────
export default function GeneratePage() {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<Partial<ExamConfig>>({
    grade: "Lớp 6", subject: "Toán", topicPrompt: "",
    mcqCount: 12, essayCount: 3, duration: 90,
    examTitle: "", schoolName: "", schoolYear: "2026 - 2027",
  });
  const [exam, setExam] = useState<GeneratedExam | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const result = await generateExam({
        ...(config as ExamConfig),
        totalQuestions: (config.mcqCount ?? 0) + (config.essayCount ?? 0),
      });
      setExam(result);
      setStep(2);
    } catch {
      setGenError("Sinh đề thất bại. Vui lòng thử lại.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1>✏️ Tạo đề thi tự động</h1>
        <p>4 bước đơn giản để có đề thi chuyên nghiệp từ tài liệu của bạn.</p>
      </div>

      <StepIndicator current={step} />

      {genError && (
        <div style={{
          marginBottom: 20, padding: "12px 16px",
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "var(--radius-md)", color: "var(--danger)", fontSize: 14,
        }}>
          ❌ {genError}
        </div>
      )}

      {step === 0 && (
        <Step1
          config={config}
          onChange={setConfig}
          onNext={() => setStep(1)}
        />
      )}
      {step === 1 && (
        <Step2
          config={config}
          onChange={setConfig}
          onBack={() => setStep(0)}
          onGenerate={handleGenerate}
          generating={generating}
        />
      )}
      {step === 2 && exam && (
        <Step3
          exam={exam}
          onUpdate={(qs) => setExam({ ...exam, questions: qs })}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && exam && (
        <Step4 exam={exam} onBack={() => setStep(2)} />
      )}
    </div>
  );
}
