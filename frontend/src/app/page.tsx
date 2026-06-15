"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboardStats, getDocuments, type DashboardStats, type Document } from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardStats(), getDocuments()]).then(([s, docs]) => {
      setStats(s);
      setRecentDocs(docs.slice(0, 3));
      setLoading(false);
    });
  }, []);

  const statCards = [
    { icon: "📚", label: "Tài liệu sẵn sàng", value: stats?.totalDocuments ?? "—", color: "#6366f1" },
    { icon: "📝", label: "Đề thi đã tạo",     value: stats?.totalExams ?? "—",     color: "#8b5cf6" },
    { icon: "❓", label: "Tổng câu hỏi",       value: stats?.totalQuestions ?? "—", color: "#06b6d4" },
  ];

  return (
    <div className="animate-fade-up">
      {/* Page Header */}
      <div className="page-header">
        <h1>Xin chào, Giáo viên 👋</h1>
        <p>Hệ thống sinh đề thi thông minh từ tài liệu học tập của bạn.</p>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 32 }}>
        {statCards.map((card) => (
          <div
            key={card.label}
            className="stat-card"
            style={{ "--hover-color": card.color } as React.CSSProperties}
          >
            <div
              className="stat-icon"
              style={{ background: `${card.color}22`, fontSize: 22 }}
            >
              {card.icon}
            </div>
            <div className="stat-value">
              {loading ? (
                <div className="skeleton" style={{ width: 48, height: 32, borderRadius: 6 }} />
              ) : (
                card.value
              )}
            </div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      {/* 2 Action Cards */}
      <div className="grid-2" style={{ marginBottom: 32 }}>
        {/* Card 1: Ngân hàng tài liệu */}
        <Link href="/library" style={{ textDecoration: "none" }}>
          <div
            className="card"
            style={{
              cursor: "pointer",
              transition: "all 0.25s ease",
              borderColor: "var(--border-subtle)",
              minHeight: 200,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--brand-500)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-brand)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            <div>
              <div style={{ fontSize: 36, marginBottom: 14 }}>📚</div>
              <h3 style={{ color: "var(--text-primary)", marginBottom: 8 }}>
                Ngân hàng Tài liệu
              </h3>
              <p style={{ fontSize: 14 }}>
                Upload và phân loại tài liệu PDF theo Khối, Lớp, Dạng đề thi và Mức độ.
                Tài liệu được xử lý tự động và sẵn sàng để sinh đề.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20 }}>
              <span className="badge badge-brand">
                {loading ? "—" : `${stats?.totalDocuments} tài liệu`}
              </span>
              <span style={{ fontSize: 13, color: "var(--brand-400)", fontWeight: 600 }}>
                Quản lý →
              </span>
            </div>
          </div>
        </Link>

        {/* Card 2: Tạo đề thi */}
        <Link href="/generate" style={{ textDecoration: "none" }}>
          <div
            className="card"
            style={{
              cursor: "pointer",
              transition: "all 0.25s ease",
              minHeight: 200,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))",
              borderColor: "var(--border-brand)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-brand)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            <div>
              <div style={{ fontSize: 36, marginBottom: 14 }}>✨</div>
              <h3 style={{ color: "var(--text-primary)", marginBottom: 8 }}>
                Tạo đề thi tự động
              </h3>
              <p style={{ fontSize: 14 }}>
                Chọn tài liệu từ ngân hàng, cấu hình số câu và mức độ, để AI sinh đề
                chuyên nghiệp — chống ảo tưởng bằng Self-RAG.
              </p>
            </div>
            <div style={{ marginTop: 20 }}>
              <span
                className="btn btn-primary btn-sm"
                style={{ display: "inline-flex" }}
              >
                ✏️ Bắt đầu tạo đề
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Documents */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3 style={{ color: "var(--text-primary)" }}>Tài liệu gần đây</h3>
          <Link
            href="/library"
            style={{ fontSize: 13, color: "var(--brand-400)", fontWeight: 600, textDecoration: "none" }}
          >
            Xem tất cả →
          </Link>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10 }} />
            ))}
          </div>
        ) : recentDocs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📂</div>
            <h3>Chưa có tài liệu nào</h3>
            <p>Hãy upload tài liệu PDF đầu tiên để bắt đầu.</p>
            <Link href="/library" className="btn btn-primary">
              📤 Upload tài liệu
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "var(--bg-elevated)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <span style={{ fontSize: 20 }}>📄</span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 320,
                      }}
                    >
                      {doc.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {doc.grade} · {doc.subject} · {doc.fileSize}
                    </div>
                  </div>
                </div>
                <span
                  className={`badge ${
                    doc.status === "ready"
                      ? "badge-success"
                      : doc.status === "processing"
                      ? "badge-warning"
                      : "badge-danger"
                  }`}
                >
                  {doc.status === "ready" ? "✓ Sẵn sàng" : doc.status === "processing" ? "⏳ Đang xử lý" : "✗ Lỗi"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div
        style={{
          marginTop: 24,
          padding: "16px 20px",
          background: "rgba(99,102,241,0.08)",
          border: "1px solid var(--border-brand)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 18 }}>🔒</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
            Strict Context-Grounding
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Mọi câu hỏi được sinh ra đều có nguồn gốc từ tài liệu của bạn. Hệ thống sử dụng
            Self-RAG để tự động loại bỏ câu hỏi ảo tưởng trước khi hiển thị.
          </div>
        </div>
      </div>
    </div>
  );
}
