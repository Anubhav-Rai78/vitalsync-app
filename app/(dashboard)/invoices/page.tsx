import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-surface-variant text-on-surface-variant",
  sent: "bg-primary-container/20 text-primary",
  paid: "bg-secondary-container/40 text-secondary",
  overdue: "bg-error-container text-on-error-container",
  void: "bg-surface-variant text-on-surface-variant line-through",
};

export default async function InvoicesPage() {
  const supabase = createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, total, currency, due_date, created_at, patients(full_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-lg">
      <div>
        <h2 className="text-headline-lg text-on-surface">Billing</h2>
        <p className="text-body-sm text-on-surface-variant mt-xs">Invoices and payment status.</p>
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Invoice</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Patient</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Due Date</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Status</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-body-sm text-on-surface">
              {(invoices ?? []).map((inv: any) => (
                <tr key={inv.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="py-sm px-md">
                    <Link href={`/invoices/${inv.id}`} className="font-mono text-[13px] hover:text-primary">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="py-sm px-md">{inv.patients?.full_name}</td>
                  <td className="py-sm px-md text-on-surface-variant">{inv.due_date ? formatDate(inv.due_date) : "—"}</td>
                  <td className="py-sm px-md">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm capitalize ${STATUS_STYLES[inv.status] ?? ""}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-sm px-md text-right tabular-nums">{formatCurrency(Number(inv.total), inv.currency)}</td>
                </tr>
              ))}
              {(!invoices || invoices.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-lg px-md text-center text-on-surface-variant">
                    No invoices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
