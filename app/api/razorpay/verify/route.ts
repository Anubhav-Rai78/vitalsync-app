import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyRazorpaySignature } from "@/lib/razorpay";

export async function POST(request: Request) {
  const { invoiceId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    await request.json();

  const valid = await verifyRazorpaySignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!valid) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  const supabase = createClient();

  await supabase
    .from("payments")
    .update({
      razorpay_payment_id,
      status: "captured",
      paid_at: new Date().toISOString(),
    })
    .eq("razorpay_order_id", razorpay_order_id);

  await supabase.from("invoices").update({ status: "paid" }).eq("id", invoiceId);

  return NextResponse.json({ ok: true });
}
