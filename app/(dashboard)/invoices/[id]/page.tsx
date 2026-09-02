import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  InvoiceDetailActions,
  type InvoiceActionItem,
  type InvoicePayment,
} from "@/components/modules/invoice-detail-actions";
import { MedFlowLogo } from "@/components/ui/medflow-logo";

/* ------------------------------------------------------------------ */
/*  UUID guard & reference invoices                                    */
/*                                                                     */
/*  The invoices list page links its demo rows (`stitch-1` … `stitch-4`)
/*  straight to this page. Those ids are NOT valid UUIDs, and querying  */
/*  Postgres with them raises `22P02: invalid input syntax for type     */
/*  uuid`. When the URL id is not a UUID we render the matching         */
/*  reference invoice and never touch the database.                     */
/* ------------------------------------------------------------------ */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ReferenceInvoice {
  invoice: {
    id: string;
    invoice_number: string;
    status: string;
    created_at: string;
    due_date: string;
    currency: string;
    subtotal: number;
    tax: number;
    total: number;
    patients: {
      full_name: string;
      address: string | null;
      phone: string | null;
      email: string | null;
    };
  };
  items: InvoiceActionItem[];
  payments: InvoicePayment[];
}

// Mirrors `INITIAL_INVOICES` in app/(dashboard)/invoices/page.tsx so the
// reference rows on the list open the correct detail document.
const REFERENCE_INVOICES: Record<string, ReferenceInvoice> = {
  "stitch-1": {
    invoice: {
      id: "stitch-1",
      invoice_number: "INV-2026-0892",
      status: "paid",
      created_at: "2026-10-24T12:00:00.000Z",
      due_date: "2026-11-07T12:00:00.000Z",
      currency: "USD",
      subtotal: 245,
      tax: 0,
      total: 245,
      patients: {
        full_name: "Sarah Jenkins",
        address: "221B Baker Street, 4th Floor, Indiranagar, Bengaluru 560038",
        phone: "+91 98765 43210",
        email: "sarah.jenkins@example.com",
      },
    },
    items: [
      { id: "ref-1-1", description: "Cardiology Consultation", quantity: 1, unit_price: 200, amount: 200 },
      { id: "ref-1-2", description: "ECG (Electrocardiogram)", quantity: 1, unit_price: 45, amount: 45 },
    ],
    payments: [
      { id: "ref-p-1", amount: 245, status: "paid", method: "UPI", paid_at: "2026-10-24T18:30:00.000Z" },
    ],
  },
  "stitch-2": {
    invoice: {
      id: "stitch-2",
      invoice_number: "INV-2026-0885",
      status: "sent",
      created_at: "2026-10-22T12:00:00.000Z",
      due_date: "2026-11-05T12:00:00.000Z",
      currency: "USD",
      subtotal: 112.5,
      tax: 0,
      total: 112.5,
      patients: {
        full_name: "Marcus Vance",
        address: "88 Richmond Road, Shivajinagar, Bengaluru 560025",
        phone: "+91 87654 32109",
        email: "marcus.vance@example.com",
      },
    },
    items: [
      { id: "ref-2-1", description: "Lab Work (Blood Panel)", quantity: 1, unit_price: 112.5, amount: 112.5 },
    ],
    payments: [],
  },
  "stitch-3": {
    invoice: {
      id: "stitch-3",
      invoice_number: "INV-2026-0870",
      status: "overdue",
      created_at: "2026-10-15T12:00:00.000Z",
      due_date: "2026-10-29T12:00:00.000Z",
      currency: "USD",
      subtotal: 75,
      tax: 0,
      total: 75,
      patients: {
        full_name: "David Chen",
        address: "Morya Galleria, Level 2, Andheri West, Mumbai 400058",
        phone: "+91 76543 21098",
        email: "david.chen@example.com",
      },
    },
    items: [
      { id: "ref-3-1", description: "Follow-up Visit", quantity: 1, unit_price: 75, amount: 75 },
    ],
    payments: [],
  },
  "stitch-4": {
    invoice: {
      id: "stitch-4",
      invoice_number: "INV-2026-0864",
      status: "paid",
      created_at: "2026-10-10T12:00:00.000Z",
      due_date: "2026-10-24T12:00:00.000Z",
      currency: "USD",
      subtotal: 180,
      tax: 0,
      total: 180,
      patients: {
        full_name: "naveen",
        address: "Plot 42, Jubilee Hills, Hyderabad 500033",
        phone: "+91 65432 10987",
        email: "naveen@example.com",
      },
    },
    items: [
      { id: "ref-4-1", description: "General Health Screening", quantity: 1, unit_price: 180, amount: 180 },
    ],
    payments: [
      { id: "ref-p-4", amount: 180, status: "paid", method: "Card", paid_at: "2026-10-10T15:05:00.000Z" },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const invoiceId = params.id;
  const isUuid = UUID_PATTERN.test(invoiceId);

  const supabase = createClient();

  // Demo links (/invoices/stitch-1 … stitch-4) are not UUIDs. Querying
  // Postgres with them raises `22P02: invalid input syntax for type uuid`,
  // so when the id is not a UUID we render the matching reference invoice
  // and skip the database entirely.
  const reference = isUuid ? null : REFERENCE_INVOICES[invoiceId];
  if (!reference && !isUuid) notFound();

  let invoice: any;
  let invoiceItems: any[] = [];
  let invoicePayments: any[] = [];

  if (isUuid) {
    const { data } = await supabase
      .from("invoices")
      .select("*, patients(full_name, address, phone, email)")
      .eq("id", invoiceId)
      .single();
    invoice = data;
    if (!invoice) notFound();

    const { data: itemRows } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId);
    const { data: paymentRows } = await supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("paid_at", { ascending: false });
    invoiceItems = itemRows ?? [];
    invoicePayments = paymentRows ?? [];
  } else {
    invoice = reference!.invoice;
    invoiceItems = reference!.items;
    invoicePayments = reference!.payments;
  }

  // Admin flag drives the refund action in the sidebar (the API route
  // enforces the same check server-side).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: viewer } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isAdmin = viewer?.role === "admin";

  const patient: any = invoice.patients;
  const actionItems: InvoiceActionItem[] = (invoiceItems ?? []).map((it: any) => ({
    id: it.id,
    description: it.description,
    quantity: it.quantity,
    unit_price: it.unit_price,
    amount: it.amount,
  }));
  const actionPayments: InvoicePayment[] = (invoicePayments ?? []).map((p: any) => ({
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
              {(invoiceItems ?? []).map((item: any) => (
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
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
