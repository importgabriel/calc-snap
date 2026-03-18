import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calculator",
  description: "A simple, modern calculator built with Next.js and Tailwind CSS.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
