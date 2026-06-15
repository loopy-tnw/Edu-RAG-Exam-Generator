"use client";

import { useEffect, useRef, useState } from "react";
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  type Document,
  type GradeLevel,
  type DocCategory,
} from "@/lib/api";

const GRADE_OPTIONS: GradeLevel[] = ["Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9"];
const DOC_CATEGORY_OPTIONS: DocCategory[] = ["Sách giáo khoa", "Sách nâng cao", "Đề thi"];

export default function LibraryPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    subject: "Toán",
    grade: "Lớp 6" as GradeLevel,
    docCategory: "Sách giáo khoa" as DocCategory,
  });

  useEffect(() => {
    getDocuments().then((docs) => { setDocuments(docs); setLoading(false); });
  }, []);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleFileSelect = (file: File) => {
    if (file.type !== "application/pdf") {
      showToast("Chỉ hỗ trợ file PDF!", "error");
      return;
    }
    setSelectedFile(file);
    setShowForm(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const newDoc = await uploadDocument(selectedFile, form);
      setDocuments((prev) => [newDoc, ...prev]);
      setShowForm(false);
      setSelectedFile(null);
      showToast("Tải lên thành công! Hệ thống đang xử lý tài liệu.", "success");
    } catch {
      showToast("Tải lên thất bại. Vui lòng thử lại.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa tài liệu "${name}"?`)) return;
    await deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    showToast("Đã xóa tài liệu.", "info");
  };

  const statusBadge = (status: Document["status"]) => {
    if (status === "ready")      return <span className="badge badge-success">✓ Sẵn sàng</span>;
    if (status === "processing") return <span className="badge badge-warning">⏳ Đang xử lý</span>;
    return <span className="badge badge-danger">✗ Lỗi</span>;
  };

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>📚 Ngân hàng Kiến thức</h1>
          <p>Upload Sách giáo khoa, Sách nâng cao, và Đề thi mẫu theo Khối 6-9.</p>
        </div>
        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
          📤 Upload PDF
        </button>
        <input
          ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />
      </div>

      {/* Upload Zone */}
      {!showForm && (
        <div
          className={`upload-zone ${dragOver ? "drag-over" : ""}`}
          style={{ marginBottom: 28 }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
            Kéo thả file PDF vào đây
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            hoặc <span style={{ color: "var(--brand-400)", fontWeight: 600 }}>click để chọn file</span>
          </div>
        </div>
      )}

      {/* Upload Form */}
      {showForm && selectedFile && (
        <div className="card-elevated" style={{ marginBottom: 28, animation: "fadeInUp 0.3s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 24 }}>📄</span>
            <div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{selectedFile.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          </div>

          <div className="grid-2" style={{ gap: 16, marginBottom: 20 }}>
            <div>
              <label className="form-label">Môn học</label>
              <input
                className="form-input" value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Vd: Toán, Văn, Lý..."
              />
            </div>
            <div>
              <label className="form-label">Khối / Lớp</label>
              <select className="form-select" value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value as GradeLevel })}>
                {GRADE_OPTIONS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label className="form-label">Phân loại tài liệu</label>
              <select className="form-select" value={form.docCategory}
                onChange={(e) => setForm({ ...form, docCategory: e.target.value as DocCategory })}>
                {DOC_CATEGORY_OPTIONS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
              {uploading ? <><span className="spinner" />  Đang xử lý...</> : "✅ Xác nhận tải lên"}
            </button>
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setSelectedFile(null); }}>
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Document List */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ color: "var(--text-primary)" }}>
            Danh sách tài liệu
            <span className="badge badge-muted" style={{ marginLeft: 10, verticalAlign: "middle" }}>
              {documents.length} file
            </span>
          </h3>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 10 }} />)}
          </div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📂</div>
            <h3>Ngân hàng trống</h3>
            <p>Upload tài liệu PDF đầu tiên để bắt đầu xây dựng ngân hàng câu hỏi.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", background: "var(--bg-elevated)",
                  borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)",
                  transition: "border-color 0.2s",
                  gap: 12,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
              >
                {/* Icon + Info */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>📄</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600, color: "var(--text-primary)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {doc.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span>📚 {doc.subject}</span>
                      <span>🎓 {doc.grade}</span>
                      <span>📝 {doc.docCategory}</span>
                      <span>📦 {doc.fileSize}</span>
                      {doc.chunkCount > 0 && <span>🔷 {doc.chunkCount} chunks</span>}
                    </div>
                  </div>
                </div>

                {/* Status + Delete */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {statusBadge(doc.status)}
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: "var(--danger)", padding: "6px 8px" }}
                    onClick={() => handleDelete(doc.id, doc.name)}
                    title="Xóa tài liệu"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            <span>{toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}</span>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
