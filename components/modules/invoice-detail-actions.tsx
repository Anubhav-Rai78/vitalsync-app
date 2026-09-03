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
import { PDFDocument, formatINRAmount } from "@/lib/document-engine";
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

// Generates a real PDF of the invoice document (no window.print() aliasing).
// Amounts are rendered with an ASCII-safe "INR" prefix because jsPDF's Helvetica
// font lacks the ₹ (U+20B9) glyph — identical to the document engine's
// formatINRAmount. HTML/email rendering continues to use formatCurrency().
function downloadInvoicePdf(invoice: any, items: InvoiceActionItem[]) {
  const doc = new PDFDocument();

  // ── Header ───────────────────────────────────────────────────────
  doc.addTwoColumn("MedFlow Clinic", "INVOICE", { fontSize: 18, bold: true, color: [37, 99, 235] });
  doc.addText(`Invoice #${invoice.invoice_number}`, { fontSize: 9, color: [100, 116, 139], align: "right" });
  doc.addDivider();
  doc.addSpacer(2);

  // ── Bill To block ───────────────────────────────────────────────
  doc.addText("BILL TO", { fontSize: 9, color: [100, 116, 139] });
  doc.addTwoColumn(
    invoice.patients?.full_name ?? "Patient",
    `Issue date: ${invoice.created_at ? formatDate(invoice.created_at) : "—"}`,
    { fontSize: 10, color: [30, 41, 59] }
  );
  if (invoice.patients?.address) doc.addText(String(invoice.patients.address), { fontSize: 10, color: [30, 41, 59] });
  doc.addText(`Due date: ${invoice.due_date ? formatDate(invoice.due_date) : "—"}`, { fontSize: 10, color: [100, 116, 139] });
  doc.addSpacer(3);

  // ── Items table ───────────────────────────────────────────────────
  const rows = items.map((it) => [
    it.description,
    String(it.quantity),
    formatINRAmount(Number(it.unit_price)),
    formatINRAmount(Number(it.amount)),
  ]);
  if (items.length === 0) rows.push(["No line items on this invoice.", "", "", ""]);
  doc.addTable(["DESCRIPTION", "QTY", "UNIT PRICE", "TOTAL"], rows, {
    fontSize: 10,
    rowHeight: 8,
    headerBg: "F8FAFC",
    headerColor: "64748B",
    columnWidths: [90, 25, 32, 33],
  });
  doc.addSpacer(2);

  // ── Totals ─────────────────────────────────────────────────────
  doc.addTwoColumn("Subtotal", formatINRAmount(Number(invoice.subtotal ?? 0)), { fontSize: 10, color: [30, 41, 59] });
  doc.addTwoColumn("Tax", formatINRAmount(Number(invoice.tax ?? 0)), { fontSize: 10, color: [30, 41, 59] });
  doc.addTwoColumn("Total", formatINRAmount(Number(invoice.total ?? 0)), { fontSize: 12, bold: true, color: [37, 99, 235] });

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
