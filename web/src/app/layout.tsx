import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "책즙기 — 고농축 인사이트 착즙기",
  description: "책 속 인사이트를 진하게 착즙해 드려요",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-bg min-h-screen">{children}</body>
    </html>
  );
}
