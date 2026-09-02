"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type InvoiceFormState = { error: string | null };

// Creates a new invoice + line item via Server Action.
// Called from the Create Invoice modal on the list page.
export async function createInvoiceAction(
  _prevState: InvoiceFormState,
  formData: FormData
): Promise<InvoiceFormState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Could not resolve your clinic." };

  const patientId = String(formData.get("patientId") || "").trim();
  const services = String(formData.get("services") || "Consultation & Clinical Services").trim();
  const amount = Number(formData.get("amount") || 0);
  const statusRaw = String(formData.get("status") || "sent").toLowerCase();
  const dbStatus =
    statusRaw === "paid" ? "paid"
      : statusRaw === "overdue" ? "overdue"
        : statusRaw === "draft" ? "draft"
          : "sent";

  if (!patientId) return { error: "Please select a patient." };
  if (amount <= 0) return { error: "Amount must be greater than zero." };

  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

  const { data: inserted, error: invError } = await supabase
    .from("invoices")
    .insert({
      clinic_id: profile.clinic_id,
      patient_id: patientId,
      invoice_number: invoiceNumber,
      status: dbStatus as any,
      subtotal: amount,
      tax: 0,
      total: amount,
      currency: "INR",
    })
    .select("id")
    .single();

  if (invError || !inserted) return { error: invError?.message || "Failed to create invoice." };

  // Insert a single line item for the services description.
  await supabase.from("invoice_items").insert({
    invoice_id: inserted.id,
    description: services,
    quantity: 1,
    unit_price: amount,
    amount,
  });

  revalidatePath("/invoices");
  return { error: null };
}

// Fallback when Razorpay SDK is unavailable in test: marks invoice as paid
// and records a simulated payment capture.
export async function markInvoicePaidAction(
  invoiceId: string,
  amount: number
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: invError } = await supabase
    .from("invoices")
    .update({ status: "paid" })
    .eq("id", invoiceId);

  if (invError) return { error: invError.message };

  await supabase.from("payments").insert({
    invoice_id: invoiceId,
    amount,
    status: "captured",
    method: "Direct (Fallback)",
    paid_at: new Date().toISOString(),
  });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  return { error: null };
}
