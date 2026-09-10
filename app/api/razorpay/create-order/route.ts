import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRazorpayOrder } from "@/lib/razorpay";
import { razorpayOrderSchema } from "@/lib/validators";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = razorpayOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }
  const { invoiceId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // ── Clinic ownership check ─────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", user.id)
    .single();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, currency, status, clinic_id")
    .eq("id", invoiceId)
    .single();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  if (!profile || profile.clinic_id !== invoice.clinic_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (invoice.status === "paid") {
    return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });
  }

  // ── Idempotency: reuse an existing pending payment row ──────
  // If the user clicks "Pay" multiple times (e.g. slow network),
  // we must not create duplicate Razorpay orders or payment rows.
  const { data: existingPayment } = await supabase
    .from("payments")
    .select("id, razorpay_order_id, status")
    .eq("invoice_id", invoiceId)
    .eq("status", "created")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let order: { id: string; amount: number; currency: string };

  if (existingPayment?.razorpay_order_id) {
    // Re-fetch the existing order from Razorpay (idempotent by order id).
    // We just need the key details to return to the client.
    order = {
      id: existingPayment.razorpay_order_id,
      amount: Number(invoice.total) * 100, // Razorpay uses paise
      currency: invoice.currency,
    };
  } else {
    try {
      order = await createRazorpayOrder({
        amountInRupees: Number(invoice.total),
        currency: invoice.currency,
        receipt: invoice.invoice_number,
        notes: { invoice_id: invoice.id },
      });

      await supabase.from("payments").insert({
        invoice_id: invoice.id,
        razorpay_order_id: order.id,
        amount: invoice.total,
        status: "created",
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  });
}
