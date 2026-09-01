"use client";

import React, { useState } from "react";
import {
  Send,
  Download,
  Printer,
  RotateCcw,
  CheckCircle2,
  X,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";

export interface InvoiceActionItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  status: string;
  method: string | null;
  paid_at: string | null;
}

const STATUS_BADGE: Record<InvoiceStatus, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-secondary-container/40 text-secondary border border-secondary/30" },
  sent: { label: "Pending", cls: "bg-primary-container/20 text-primary border border-primary/30" },
  overdue: { label: "Overdue", cls: "bg-error-container text-on-error-container border border-error/30" },
  draft: { label: "Draft", cls: "bg-surface-variant text-on-surface-variant border border-outline-variant" },
  void: { label: "Void", cls: "bg-surface-variant text-on-surface-variant border border-outline-variant line-through" },
};

// Generates a real PDF of the invoice document (no window.print() aliasing).
function downloadInvoicePdf(invoice: any, items: InvoiceActionItem[]) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  const subtitle = (text: string, color: [number, number, number] = [100, 116, 139]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, 14, y);
    y += 5;
  };

  const bodyLine = (text: string, right?: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    if (right) {
      const rightWidth = doc.getTextWidth(right);
      doc.text(right, pageWidth - 14 - rightWidth, y);
    }
    doc.text(text, 14, y);
    y += 6;
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235);
  doc.text("MedFlow Clinic", 14, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text("INVOICE", pageWidth - 14, y, { align: "right" });
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Invoice #${invoice.invoice_number}`, pageWidth - 14, y, { align: "right" });
  y += 7;

  // Meta block
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;
  subtitle("BILL TO", [100, 116, 139]);
  bodyLine(invoice.patients?.full_name ?? "Patient", `Issue date: ${invoice.created_at ? formatDate(invoice.created_at) : "—"}`);
  if (invoice.patients?.address) bodyLine(String(invoice.patients.address));
  doc.setTextColor(100, 116, 139);
  bodyLine(`Due date: ${invoice.due_date ? formatDate(invoice.due_date) : "—"}`);
  doc.setTextColor(30, 41, 59);
  y += 3;

  // Items header
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y - 5, pageWidth - 28, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("DESCRIPTION", 16, y);
  doc.text("QTY", pageWidth - 72, y);
  doc.text("UNIT PRICE", pageWidth - 58, y);
  doc.text("TOTAL", pageWidth - 18, y, { align: "right" });
  y += 9;

  // Items rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  for (const it of items) {
    bodyLine(
      it.description,
      formatCurrency(Number(it.amount), invoice.currency)
    );
    doc.text(String(it.quantity), pageWidth - 70, y - 6);
    doc.text(formatCurrency(Number(it.unit_price), invoice.currency), pageWidth - 58, y - 6);
  }

  if (items.length === 0) {
    bodyLine("No line items on this invoice.");
    y -= 6;
  }

  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Totals
  bodyLine("Subtotal", formatCurrency(Number(invoice.subtotal ?? 0), invoice.currency));
  bodyLine("Tax", formatCurrency(Number(invoice.tax ?? 0), invoice.currency));
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", 14, y);
  doc.setTextColor(37, 99, 235);
  doc.text(
    formatCurrency(Number(invoice.total ?? 0), invoice.currency),
    pageWidth - 14,
    y,
    { align: "right" }
  );

  doc.save(`${invoice.invoice_number}.pdf`);
}


export function InvoiceDetailActions({
  invoice,
  items,
  payments,
  patientEmail,
  isAdmin = false,
}: {
  invoice: any;
  items: InvoiceActionItem[];
  payments: InvoicePayment[];
  patientEmail?: string | null;
  isAdmin?: boolean;
}) {
  const [refunding, setRefunding] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const status = (invoice.status || "draft") as InvoiceStatus;
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.draft;

  const sendEmail = () => {
    const subject = encodeURIComponent(`Invoice ${invoice.invoice_number} from MedFlow Clinic`);
    const body = encodeURIComponent(`Dear patient,\n\nPlease find invoice ${invoice.invoice_number} for ${formatCurrency(Number(invoice.total), invoice.currency)}.\n\nThank you,\nMedFlow Clinic`);
    window.location.href = `mailto:${patientEmail ?? ""}?subject=${subject}&body=${body}`;
    setActionMsg("Email draft opened in your mail client.");
  };

  const downloadPdf = () => {
    downloadInvoicePdf(invoice, items);
    setActionMsg("Invoice PDF downloaded.");
  };

  const handleRefund = async () => {
    setRefunding(true);
    setActionError(null);
    setActionMsg(null);
    try {
      const res = await fetch("/api/razorpay/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Refund failed");
      }
      setActionMsg("Invoice refunded and marked as void.");
      window.setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      setActionError(err.message ?? "Refund failed");
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="w-full xl:w-80 space-y-4 shrink-0">
      {/* Status card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center justify-between shadow-sm">
        <span className="text-body-sm font-semibold text-on-surface-variant">Status</span>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-sm font-bold ${badge.cls}`}>
          {status === "paid" && <CheckCircle2 className="w-3.5 h-3.5" />}
          {badge.label}
        </span>
      </div>

      {(actionMsg || actionError) && (
        <div
          className={`rounded-xl px-3 py-2 text-body-sm ${
            actionError
              ? "bg-error-container text-on-error-container"
              : "bg-secondary-container/30 text-secondary"
          }`}
        >
          {actionError ?? actionMsg}
          {actionMsg && (
            <button onClick={() => setActionMsg(null)} className="ml-2 align-middle text-on-surface-variant">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm space-y-2.5">
        <h4 className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-2 font-semibold">Actions</h4>
        <Button className="w-full flex items-center justify-center gap-1.5 text-label-md" onClick={sendEmail}>
          <Send className="w-3.5 h-3.5" /> Send via Email
        </Button>
        <Button variant="secondary" className="w-full flex items-center justify-center gap-1.5 text-label-md" onClick={downloadPdf}>
          <Download className="w-3.5 h-3.5" /> Download PDF
        </Button>
        <div className={`grid gap-2 pt-1 ${isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
          <Button variant="secondary" className="flex items-center justify-center gap-1.5 text-label-md" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          {isAdmin && (
            <Button
              variant="secondary"
              className="flex items-center justify-center gap-1.5 text-label-md text-error hover:bg-error-container/40"
              onClick={handleRefund}
              disabled={refunding || status === "void"}
            >
              <RotateCcw className="w-3.5 h-3.5" /> {refunding ? "Refunding…" : "Refund"}
            </Button>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm space-y-3">
        <h4 className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Payment History</h4>
        {payments.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">No payments recorded yet.</p>
        ) : (
          <div className="space-y-4 text-body-sm">
            {payments.map((p) => (
              <div key={p.id} className="flex gap-2.5 items-start">
                <span className="w-2 h-2 rounded-full bg-secondary mt-1.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-on-surface capitalize">
                    {p.status === "refunded" ? "Payment Refunded" : "Payment Received"}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">
                    {p.method ? `${p.method} • ` : ""}
                    {formatCurrency(Number(p.amount), invoice.currency)}
                  </p>
                  <div className="flex justify-between items-center text-label-sm text-on-surface-variant mt-1">
                    <span>{p.paid_at ? `${formatDate(p.paid_at)} · ${formatTime(p.paid_at)}` : "—"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2.5 items-start pt-2 border-t border-outline-variant">
          <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-on-surface">Invoice Generated</p>
            <p className="text-label-sm text-on-surface-variant">System automated</p>
            <p className="text-label-sm text-on-surface-variant mt-1">{formatDate(invoice.created_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
