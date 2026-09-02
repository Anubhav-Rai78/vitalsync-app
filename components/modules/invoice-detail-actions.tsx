"use client";

import React, { useState } from "react";
import {
  Send,
  Download,
  Printer,
  RotateCcw,
  CheckCircle2,
  CreditCard,
  X,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { markInvoicePaidAction } from "@/app/(dashboard)/invoices/actions";

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

/** PDF-safe currency formatter — jsPDF built-in fonts lack the ₹ glyph. */
function pdfCurrency(amount: number, _currency?: string): string {
  return `INR ${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Generates a professional invoice PDF with clinic branding, table grid, and
// footer disclaimer — all using ASCII-safe currency formatting (INR, never ₹).
function downloadInvoicePdf(invoice: any, items: InvoiceActionItem[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth(); // 210
  const margin = 16;
  const contentW = pw - margin * 2; // 178
  let y = 0;

  // ── Header background ──────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pw, 48, "F");

  // Clinic brand (left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(0, 74, 198);
  doc.text("MedFlow Clinic", margin, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("100 Feet Road, HAL 2nd Stage, Indiranagar", margin, 26);
  doc.text("Bengaluru, Karnataka 560038  |  +91 (80) 4123-4567", margin, 31);
  doc.text("GSTIN: 29AAAAA0000A1Z5  |  contact@medflow.in", margin, 36);

  // Invoice meta (right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("TAX INVOICE", pw - margin, 20, { align: "right" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Invoice No: ${invoice.invoice_number}`, pw - margin, 26, { align: "right" });
  doc.text(`Date: ${invoice.created_at ? formatDate(invoice.created_at) : "—"}`, pw - margin, 31, { align: "right" });

  const statusLabel = (invoice.status ?? "draft").toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(statusLabel === "PAID" ? 22 : 234, statusLabel === "PAID" ? 163 : 88, statusLabel === "PAID" ? 74 : 12);
  doc.text(`Status: ${statusLabel}`, pw - margin, 36, { align: "right" });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, 48, pw - margin, 48);
  y = 56;

  // ── Bill To ────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("BILLED TO:", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.patients?.full_name ?? "Patient", margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  if (invoice.patients?.address) {
    doc.text(String(invoice.patients.address), margin, y);
    y += 5;
  }
  doc.text(`Patient ID: ${invoice.patient_id ?? "—"}`, margin, y);
  y += 10;

  // ── Items table ────────────────────────────────────────────────────────
  // Header row
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y - 5, contentW, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("ITEM DESCRIPTION", margin + 4, y);
  doc.text("QTY", pw - 72, y, { align: "center" });
  doc.text("UNIT PRICE", pw - 48, y, { align: "right" });
  doc.text("AMOUNT", pw - margin - 2, y, { align: "right" });
  y += 8;

  // Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);

  if (items.length === 0) {
    doc.text("No line items on this invoice.", margin + 4, y);
    y += 8;
  } else {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 5, contentW, 8, "F");
      }
      doc.text(it.description, margin + 4, y);
      doc.text(String(it.quantity), pw - 72, y, { align: "center" });
      doc.text(pdfCurrency(it.unit_price, invoice.currency), pw - 48, y, { align: "right" });
      doc.text(pdfCurrency(it.amount, invoice.currency), pw - margin - 2, y, { align: "right" });
      y += 8;
    }
  }

  // ── Totals ─────────────────────────────────────────────────────────────
  y += 2;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pw - margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("Subtotal:", pw - 70, y, { align: "right" });
  doc.text(pdfCurrency(invoice.subtotal ?? 0, invoice.currency), pw - margin - 2, y, { align: "right" });
  y += 6;
  doc.text("GST / Taxes (0%):", pw - 70, y, { align: "right" });
  doc.text(pdfCurrency(invoice.tax ?? 0, invoice.currency), pw - margin - 2, y, { align: "right" });
  y += 8;

  // Total row with blue highlight
  doc.setFillColor(0, 74, 198);
  doc.rect(margin, y - 5, contentW, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL AMOUNT", margin + 4, y + 1);
  doc.text(pdfCurrency(invoice.total ?? 0, invoice.currency), pw - margin - 2, y + 1, { align: "right" });
  y += 16;

  if ((invoice.status ?? "").toUpperCase() === "PAID") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(22, 163, 74);
    doc.text("PAID IN FULL", margin, y);
  }

  // ── Footer ─────────────────────────────────────────────────────────────
  const footerY = 272;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pw - margin, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Thank you for choosing MedFlow Clinic. This is a computer-generated invoice.", margin, footerY + 5);
  doc.text("For queries, contact accounts@medflow.in or call +91 (80) 4123-4567.", margin, footerY + 10);

  doc.save(`${(invoice.invoice_number ?? "invoice").replace("#", "")}.pdf`);
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
  const [paying, setPaying] = useState(false);
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

  const handlePayInvoice = async () => {
    setPaying(true);
    setActionError(null);
    setActionMsg(null);
    try {
      // Attempt Razorpay SDK checkout when key is available.
      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (razorpayKey && typeof (window as any).Razorpay !== "undefined") {
        const ordRes = await fetch("/api/razorpay/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceId: invoice.id, amount: Number(invoice.total) }),
        });
        if (ordRes.ok) {
          const order = await ordRes.json();
          const rzp = new (window as any).Razorpay({
            key: razorpayKey,
            order_id: order.id,
            amount: order.amount,
            currency: "INR",
            name: "MedFlow Clinic",
            description: `Invoice ${invoice.invoice_number}`,
            handler: () => { setActionMsg("Payment successful! Refresh to see updated status."); },
          });
          rzp.open();
          return;
        }
      }
      // Fallback: directly mark invoice as paid via server action.
      const result = await markInvoicePaidAction(invoice.id, Number(invoice.total));
      if (result.error) throw new Error(result.error);
      setActionMsg("Invoice marked as paid. Refreshing…");
      window.setTimeout(() => window.location.reload(), 900);
    } catch (err: any) {
      setActionError(err.message ?? "Payment failed.");
    } finally {
      setPaying(false);
    }
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

        {/* Pay Invoice — shown only when not already paid/void */}
        {status !== "paid" && status !== "void" && (
          <Button
            className="w-full flex items-center justify-center gap-1.5 text-label-md bg-secondary text-on-secondary hover:bg-secondary/90"
            onClick={handlePayInvoice}
            disabled={paying}
          >
            <CreditCard className="w-3.5 h-3.5" />
            {paying ? "Processing…" : "Pay Invoice"}
          </Button>
        )}

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
