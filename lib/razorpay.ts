// Thin wrapper around Razorpay's REST API using fetch + Basic Auth,
// so we don't need to add the razorpay npm package as a dependency.
// Docs: https://razorpay.com/docs/api/orders/

const RAZORPAY_BASE_URL = "https://api.razorpay.com/v1";

function authHeader() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!;
  const keySecret = process.env.RAZORPAY_KEY_SECRET!;
  const token = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return `Basic ${token}`;
}

export async function createRazorpayOrder(params: {
  amountInRupees: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const res = await fetch(`${RAZORPAY_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(params.amountInRupees * 100), // paise
      currency: params.currency ?? "INR",
      receipt: params.receipt,
      notes: params.notes,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Razorpay order creation failed: ${res.status} ${body}`);
  }

  return res.json() as Promise<{ id: string; amount: number; currency: string }>;
}

// Verifies the signature Razorpay sends back after checkout completes.
// See: https://razorpay.com/docs/payments/server-integration/nodejs/payment-gateway/build-integration/#3-verify-payment-signature
export async function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const crypto = await import("crypto");
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  return expected === params.signature;
}
