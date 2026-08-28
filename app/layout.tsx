import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VitalSync — Clinic Management System",
  description: "VitalSync clinic management system.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="bg-background text-on-surface">{children}</body>
    </html>
  );
}
