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
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
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

function downloadInvoiceTxt(invoice: any, items: InvoiceActionItem[]) {
  const lines = [
    "MedFlow Clinic",
    "Invoice #" + invoice.invoice_number,
    "Status: " + invoice.status,
    "",
    "ITEMS",
    ...items.map((it) => `${it.description}  x${it.quantity}  ${formatCurrency(Number(it.unit_price), invoice.currency)}  =  ${formatCurrency(Number(it.amount), invoice.currency)}`),
    "",
    "Subtotal: " + formatCurrency(Number(invoice.subtotal), invoice.currency),
    "Tax: " + formatCurrency(Number(invoice.tax), invoice.currency),
    "Total: " + formatCurrency(Number(invoice.total), invoice.currency),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoice.invoice_number}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


export function InvoiceDetailActions({
  invoice,
  items,
  payments,
  patientEmail,
}: {
  invoice: any;
  items: InvoiceActionItem[];
  payments: InvoicePayment[];
  patientEmail?: string | null;
}) {
  const [refunding, setRefunding] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const supabase = createClient();

  const status = (invoice.status || "draft") as InvoiceStatus;
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.draft;

  const sendEmail = () => {
    const subject = encodeURIComponent(`Invoice ${invoice.invoice_number} from MedFlow Clinic`);
    const body = encodeURIComponent(`Dear patient,\n\nPlease find invoice ${invoice.invoice_number} for ${formatCurrency(Number(invoice.total), invoice.currency)}.\n\nThank you,\nMedFlow Clinic`);
    window.location.href = `mailto:${patientEmail ?? ""}?subject=${subject}&body=${body}`;
    setActionMsg("Email draft opened in your mail client.");
  };

  const downloadPdf = () => {
    downloadInvoiceTxt(invoice, items);
    setActionMsg("Invoice downloaded.");
  };

  const handleRefund = async () => {
    setRefunding(true);
    setActionError(null);
    setActionMsg(null);
    try {
      if (payments.length > 0) {
        await supabase
          .from("payments")
          .update({ status: "refunded" })
          .eq("invoice_id", invoice.id);
      }
      await supabase.from("invoices").update({ status: "void" }).eq("id", invoice.id);
      setActionMsg("Invoice refunded and marked as void.");
      window.location.reload();
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
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button variant="secondary" className="flex items-center justify-center gap-1.5 text-label-md" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          <Button
            variant="secondary"
            className="flex items-center justify-center gap-1.5 text-label-md text-error hover:bg-error-container/40"
            onClick={handleRefund}
            disabled={refunding || status === "void"}
          >
            <RotateCcw className="w-3.5 h-3.5" /> {refunding ? "Refunding…" : "Refund"}
          </Button>
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
