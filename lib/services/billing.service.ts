// ─── Billing Service ─────────────────────────────────────────────────────────
// Encapsulates all invoice, line-item, and payment queries behind typed,
// injectable functions. Services never call createClient() themselves — the
// caller passes an authenticated Supabase client (server or browser) so these
// are testable and usable in any React context.
// ──────────────────────────────────────────────────────────────────────────────

import { DatabaseError } from "@/lib/errors";
import { createInvoiceSchema, type CreateInvoicePayload } from "@/lib/validators";
import type { InvoiceWithPatient, SupabaseClient } from "./types";

const INVOICE_SELECT = `
  id,
  invoice_number,
  status,
  subtotal,
  tax,
  total,
  currency,
  due_date,
  created_at,
  patients ( full_name )
`;

/**
 * List all invoices for a clinic, newest first, with patient names joined in.
 * Returns an empty array (never throws) when there are no invoices.
 */
export async function getInvoices(
  client: SupabaseClient,
  opts: { limit?: number } = {},
): Promise<InvoiceWithPatient[]> {
  const { limit = 100 } = opts;

  const { data, error } = await client
    .from("invoices")
    .select(INVOICE_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new DatabaseError("Failed to load invoices.", { cause: error });
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    invoice_number: row.invoice_number,
    status: row.status,
    subtotal: row.subtotal,
    tax: row.tax,
    total: row.total,
    currency: row.currency,
    due_date: row.due_date,
    created_at: row.created_at,
    patient_name: row.patients?.[0]?.full_name ?? row.patients?.full_name ?? null,
  }));
}

/**
 * Fetch a single invoice by id, including its line items.
 * Throws DatabaseError on query failure; returns null when not found.
 */
export async function getInvoiceById(
  client: SupabaseClient,
  invoiceId: string,
): Promise<(InvoiceWithPatient & { line_items: { id: string; description: string; quantity: number; unit_price: number; amount: number }[] }) | null> {
  const { data, error } = await client
    .from("invoices")
    .select(`${INVOICE_SELECT}, invoice_items ( id, description, quantity, unit_price, amount )`)
    .eq("id", invoiceId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new DatabaseError("Failed to load invoice.", { cause: error });
  }

  const row: any = data;

  return {
    id: row.id,
    invoice_number: row.invoice_number,
    status: row.status,
    subtotal: row.subtotal,
    tax: row.tax,
    total: row.total,
    currency: row.currency,
    due_date: row.due_date,
    created_at: row.created_at,
    patient_name: row.patients?.[0]?.full_name ?? row.patients?.full_name ?? null,
    line_items: row.invoice_items ?? [],
  };
}

/**
 * Create a new invoice with line items. Validates the payload with the
 * createInvoiceSchema before writing. Returns the new invoice id.
 */
export async function createInvoice(
  client: SupabaseClient,
  clinicId: string,
  payload: CreateInvoicePayload,
): Promise<string> {
  const parsed = createInvoiceSchema.parse(payload);
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

  const { data: inserted, error } = await client
    .from("invoices")
    .insert({
      clinic_id: clinicId,
      patient_id: parsed.patient_id,
      invoice_number: invoiceNumber,
      status: "sent",
      subtotal: parsed.amount,
      tax: 0,
      total: parsed.amount,
      currency: "INR",
      due_date: parsed.due_date || null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new DatabaseError("Failed to create invoice.", { cause: error });
  }

  const lineItems = parsed.line_items.length > 0
    ? parsed.line_items
    : [{ description: "Consultation & Clinical Services", quantity: 1, unit_price: parsed.amount }];

  for (const item of lineItems) {
    const { error: itemError } = await client.from("invoice_items").insert({
      invoice_id: inserted.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: item.quantity * item.unit_price,
    });
    if (itemError) {
      throw new DatabaseError("Invoice created but line items failed.", { cause: itemError });
    }
  }

  return inserted.id;
}


/**
 * Mark an invoice as paid and record a payment entry.
 */
export async function markInvoicePaid(
  client: SupabaseClient,
  invoiceId: string,
  amount: number,
  opts: { method?: string } = {},
): Promise<void> {
  const { error: invError } = await client
    .from("invoices")
    .update({ status: "paid" })
    .eq("id", invoiceId);

  if (invError) {
    throw new DatabaseError("Failed to mark invoice as paid.", { cause: invError });
  }

  const { error: payError } = await client.from("payments").insert({
    invoice_id: invoiceId,
    amount,
    status: "captured",
    method: opts.method ?? "Direct (Fallback)",
    paid_at: new Date().toISOString(),
  });

  if (payError) {
    throw new DatabaseError("Invoice marked paid but payment record failed.", { cause: payError });
  }
}

/**
 * Aggregate invoice totals for a date range — used by reporting.
 * Returns zeroed totals when no invoices exist in the window.
 */
export async function getInvoiceTotals(
  client: SupabaseClient,
  clinicId: string,
  from: string,
  to: string,
): Promise<{ total: number; count: number }> {
  const { data, error } = await client
    .from("invoices")
    .select("total, status")
    .eq("clinic_id", clinicId)
    .gte("created_at", from)
    .lte("created_at", to);

  if (error) {
    throw new DatabaseError("Failed to aggregate invoice totals.", { cause: error });
  }

  const invoices = data ?? [];
  return {
    total: invoices.reduce((sum, inv) => sum + (inv.status === "paid" ? inv.total : 0), 0),
    count: invoices.length,
  };
}

