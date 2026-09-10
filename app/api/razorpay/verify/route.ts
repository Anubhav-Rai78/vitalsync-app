import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { razorpayVerifySchema } from "@/lib/validators";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = razorpayVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }
  const { invoiceId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  const valid = await verifyRazorpaySignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!valid) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  const supabase = await createClient();

  // ── Auth gate ──────────────────────────────────────────────
  // Without this, anyone who obtains a Razorpay order id could
  // forge a verify callback and mark arbitrary invoices as paid.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // ── Clinic ownership check ─────────────────────────────────
  // Ensure the authenticated user's clinic actually owns this invoice.
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, clinic_id")
    .eq("id", invoiceId)
    .single();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.clinic_id !== invoice.clinic_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Verify and persist ─────────────────────────────────────
  // Only update the payment row that belongs to this invoice,
  // preventing cross-invoice tampering.
  await supabase
    .from("payments")
    .update({
      razorpay_payment_id,
      status: "captured",
      paid_at: new Date().toISOString(),
    })
    .eq("razorpay_order_id", razorpay_order_id)
    .eq("invoice_id", invoiceId);

  await supabase.from("invoices").update({ status: "paid" }).eq("id", invoiceId);

  return NextResponse.json({ ok: true });
}
