import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refundRazorpayPayment } from "@/lib/razorpay";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/razorpay/refund — admin-only. Looks up the invoice's captured
// Razorpay payment, issues a real refund at Razorpay, then marks the local
// `payments` row refunded and the invoice void.
export async function POST(request: Request) {
  const { invoiceId } = await request.json();
  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
  }
  // Guard against non-UUID ids (e.g. the reference demo ids 'stitch-1').
  // Querying the `invoices` table with them raises Postgres error 22P02.
  if (!UUID_PATTERN.test(invoiceId)) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 403 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, total")
    .eq("id", invoiceId)
    .single();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  if (invoice.status === "void") {
    return NextResponse.json({ error: "Invoice is already void" }, { status: 400 });
  }

  // Only an actually captured Razorpay payment can be refunded.
  const { data: payment } = await supabase
    .from("payments")
    .select("id, razorpay_payment_id, amount, status")
    .eq("invoice_id", invoiceId)
    .eq("status", "captured")
    .not("razorpay_payment_id", "is", null)
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment?.razorpay_payment_id) {
    return NextResponse.json(
      { error: "No captured Razorpay payment found for this invoice" },
      { status: 400 }
    );
  }

  try {
    await refundRazorpayPayment({
      paymentId: payment.razorpay_payment_id,
      amountInRupees: Number(payment.amount),
      notes: { invoice_id: invoice.id, invoice_number: invoice.invoice_number },
    });

    await supabase
      .from("payments")
      .update({ status: "refunded" })
      .eq("id", payment.id);
    await supabase.from("invoices").update({ status: "void" }).eq("id", invoice.id);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}