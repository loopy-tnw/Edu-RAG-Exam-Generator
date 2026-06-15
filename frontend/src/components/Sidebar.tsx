"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    section: "Tổng quan",
    items: [
      { href: "/", label: "Dashboard", icon: "🏠" },
    ],
  },
  {
    section: "Tài liệu",
    items: [
      { href: "/library", label: "Ngân hàng Tài liệu", icon: "📚" },
    ],
  },
  {
    section: "Đề thi",
    items: [
      { href: "/generate", label: "Tạo đề thi", icon: "✏️" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <div className="logo-icon">📖</div>
          <div className="logo-text">
            <span className="logo-title">Edu-RAG</span>
            <span className="logo-subtitle">Exam Generator</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div key={section.section}>
            <div className="nav-section-title">{section.section}</div>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href ? "active" : ""}`}
              >
                <span className="nav-item-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: 2 }}>
            Gemini 1.5 Flash
          </div>
          <div>Free tier · Đang hoạt động</div>
        </div>
      </div>
    </aside>
  );
}
