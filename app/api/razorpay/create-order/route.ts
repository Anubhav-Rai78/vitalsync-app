import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRazorpayOrder } from "@/lib/razorpay";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, currency, status")
    .eq("id", invoiceId)
    .single();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  if (invoice.status === "paid") {
    return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });
  }

  try {
    const order = await createRazorpayOrder({
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

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
