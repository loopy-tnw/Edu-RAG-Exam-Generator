import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Edu-RAG — Sinh đề thi thông minh từ tài liệu học tập",
  description:
    "Hệ thống RAG giúp giáo viên tạo đề thi tự động từ tài liệu PDF. Chống ảo tưởng bằng Self-RAG, xuất file Word/PDF chuẩn Bộ GD&ĐT.",
  keywords: ["sinh đề thi", "AI", "RAG", "giáo dục", "giáo viên", "đề thi tự động"],
  openGraph: {
    title: "Edu-RAG — Sinh đề thi thông minh",
    description: "Tạo đề thi chuyên nghiệp từ tài liệu của bạn với AI.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} h-full`}>
      <body className="min-h-full">
        <div className="app-shell">
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
