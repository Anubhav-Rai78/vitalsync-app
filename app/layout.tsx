import type { Metadata } from "next";
import "./globals.css";
import { ErrorHandler } from "@/components/providers/error-handler";

export const metadata: Metadata = {
  title: "MedFlow Clinic",
  description: "MedFlow Clinic Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="bg-background text-on-surface">
        <ErrorHandler>{children}</ErrorHandler>
      </body>
    </html>
  );
}

