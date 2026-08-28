import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/server";

// Configure this URL in the Razorpay dashboard under Webhooks, with the
// same secret as RAZORPAY_WEBHOOK_SECRET. This is the source of truth for
// payment status — the client-side /api/razorpay/verify call is a fast
// path for immediate UI feedback, but a dropped connection there must
// not leave an invoice stuck as unpaid, which is what this route guards.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");

  if (signature !== expected) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const admin = createAdminClient();

  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    await admin
      .from("payments")
      .update({
        razorpay_payment_id: payment.id,
        status: "captured",
        method: payment.method,
        paid_at: new Date(payment.created_at * 1000).toISOString(),
      })
      .eq("razorpay_order_id", payment.order_id);

    const { data: pmt } = await admin
      .from("payments")
      .select("invoice_id")
      .eq("razorpay_order_id", payment.order_id)
      .single();

    if (pmt) {
      await admin.from("invoices").update({ status: "paid" }).eq("id", pmt.invoice_id);
    }
  }

  if (event.event === "payment.failed") {
    const payment = event.payload.payment.entity;
    await admin
      .from("payments")
      .update({ status: "failed" })
      .eq("razorpay_order_id", payment.order_id);
  }

  return NextResponse.json({ ok: true });
}
