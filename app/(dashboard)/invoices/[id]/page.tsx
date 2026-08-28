import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PayInvoiceButton } from "@/components/modules/pay-invoice-button";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, patients(full_name, address, phone, email)")
    .eq("id", params.id)
    .single();

  if (!invoice) notFound();

  const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", params.id);
  const patient: any = invoice.patients;

  return (
    <div className="max-w-3xl mx-auto space-y-lg">
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-xl">
        <div className="flex justify-between items-start mb-xl">
          <div>
            <h2 className="text-headline-md text-primary font-bold">VitalSync</h2>
            <p className="text-body-sm text-on-surface-variant mt-1">Invoice #{invoice.invoice_number}</p>
          </div>
          <div className="text-right">
            <h3 className="text-headline-lg text-on-surface font-bold uppercase tracking-tight">Invoice</h3>
            <p className="text-body-sm text-on-surface-variant mt-1">
              {invoice.due_date ? `Due ${formatDate(invoice.due_date)}` : ""}
            </p>
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
              <th className="py-sm px-md text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold w-3/5">
                Description
              </th>
              <th className="py-sm px-md text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold text-center w-1/5">
                Qty
              </th>
              <th className="py-sm px-md text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold text-right w-1/5">
                Unit Price
              </th>
              <th className="py-sm px-md text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold text-right w-1/5">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/50 text-body-sm text-on-surface">
            {(items ?? []).map((item) => (
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
              <span className="text-headline-md text-primary font-bold tabular-nums">
                {formatCurrency(Number(invoice.total), invoice.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {invoice.status !== "paid" && invoice.status !== "void" && (
        <PayInvoiceButton
          invoiceId={invoice.id}
          amount={Number(invoice.total)}
          currency={invoice.currency}
          patientEmail={patient?.email}
          patientName={patient?.full_name}
        />
      )}
      {invoice.status === "paid" && (
        <div className="bg-secondary-container/20 text-secondary rounded-xl p-lg text-center text-label-md">
          ✓ This invoice has been paid.
        </div>
      )}
    </div>
  );
}
