import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PayInvoiceButton } from "@/components/modules/pay-invoice-button";
import {
  InvoiceDetailActions,
  type InvoiceActionItem,
  type InvoicePayment,
} from "@/components/modules/invoice-detail-actions";
import { MedFlowLogo } from "@/components/ui/medflow-logo";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, patients(full_name, address, phone, email)")
    .eq("id", params.id)
    .single();

  if (!invoice) notFound();

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", params.id);
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("invoice_id", params.id)
    .order("paid_at", { ascending: false });

  const patient: any = invoice.patients;
  const actionItems: InvoiceActionItem[] = (items ?? []).map((it: any) => ({
    id: it.id,
    description: it.description,
    quantity: it.quantity,
    unit_price: it.unit_price,
    amount: it.amount,
  }));
  const actionPayments: InvoicePayment[] = (payments ?? []).map((p: any) => ({
    id: p.id,
    amount: p.amount,
    status: p.status,
    method: p.method,
    paid_at: p.paid_at,
  }));

  return (
    <div className="space-y-6 pb-xl">
      {/* Breadcrumbs */}
      <div className="flex items-center text-body-sm text-on-surface-variant font-medium">
        <Link href="/invoices" className="hover:text-primary transition">Billing</Link>
        <ChevronRight className="w-3.5 h-3.5 mx-1" />
        <span className="text-on-surface font-semibold">Invoice #{invoice.invoice_number}</span>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Invoice Document Canvas */}
        <div className="flex-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-xl relative overflow-hidden shadow-sm">
          <div className="flex justify-between items-start mb-xl border-b border-outline-variant pb-6">
            <div>
              <MedFlowLogo size="sm" />
              <p className="text-body-sm text-on-surface-variant mt-1">Invoice #{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <h3 className="text-headline-lg text-on-surface font-bold uppercase tracking-tight">Invoice</h3>
              <div className="mt-2 flex gap-6 justify-end text-body-sm">
                <div>
                  <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Issue Date</p>
                  <p className="font-semibold text-on-surface">{formatDate(invoice.created_at)}</p>
                </div>
                <div>
                  <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Due Date</p>
                  <p className="font-semibold text-on-surface">{invoice.due_date ? formatDate(invoice.due_date) : "—"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-xl">
            <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">Bill To</p>
            <h4 className="text-headline-sm text-on-surface font-bold">{patient?.full_name}</h4>
            <p className="text-body-sm text-on-surface-variant">{patient?.address}</p>
            <p className="text-body-sm text-on-surface-variant">{patient?.phone}</p>
          </div>

          <table className="w-full text-left border-collapse mb-lg">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="py-sm px-md text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold w-3/5">Description</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold text-center w-1/5">Qty</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold text-right w-1/5">Unit Price</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold text-right w-1/5">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50 text-body-sm text-on-surface">
              {(items ?? []).map((item: any) => (
                <tr key={item.id}>
                  <td className="py-sm px-md">{item.description}</td>
                  <td className="py-sm px-md text-center tabular-nums">{item.quantity}</td>
                  <td className="py-sm px-md text-right tabular-nums">{formatCurrency(Number(item.unit_price), invoice.currency)}</td>
                  <td className="py-sm px-md text-right tabular-nums">{formatCurrency(Number(item.amount), invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-body-sm text-on-surface-variant">Subtotal</span>
                <span className="text-body-sm text-on-surface tabular-nums">{formatCurrency(Number(invoice.subtotal), invoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-body-sm text-on-surface-variant">Tax</span>
                <span className="text-body-sm text-on-surface tabular-nums">{formatCurrency(Number(invoice.tax), invoice.currency)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-outline-variant">
                <span className="text-headline-sm text-on-surface font-bold">Total</span>
                <span className="text-headline-md text-primary font-bold tabular-nums">{formatCurrency(Number(invoice.total), invoice.currency)}</span>
              </div>
            </div>
          </div>

          {invoice.status !== "paid" && invoice.status !== "void" && (
            <div className="mt-lg">
              <PayInvoiceButton
                invoiceId={invoice.id}
                amount={Number(invoice.total)}
                currency={invoice.currency}
                patientEmail={patient?.email}
                patientName={patient?.full_name}
              />
            </div>
          )}
          {invoice.status === "paid" && (
            <div className="mt-lg flex items-center gap-2 rounded-xl bg-secondary-container/20 text-secondary p-lg text-label-md">
              <ShieldCheck className="w-4 h-4" /> Payment received in full. Thank you for choosing MedFlow Clinic.
            </div>
          )}
        </div>

        {/* Sidebar: Actions & History */}
        <InvoiceDetailActions
          invoice={invoice}
          items={actionItems}
          payments={actionPayments}
          patientEmail={patient?.email}
        />
      </div>
    </div>
  );
}
