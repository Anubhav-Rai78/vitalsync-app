"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { formatCurrency } from "@/lib/utils";
import { apiClient } from "@/lib/api/client";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function PayInvoiceButton({
  invoiceId,
  amount,
  currency,
  patientEmail,
  patientName,
}: {
  invoiceId: string;
  amount: number;
  currency: string;
  patientEmail?: string | null;
  patientName?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const order = await apiClient<{
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
      }>("/api/razorpay/create-order", {
        method: "POST",
        body: JSON.stringify({ invoiceId }),
      });

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "MedFlow",
        description: "Invoice payment",
        order_id: order.orderId,
        prefill: { name: patientName ?? "", email: patientEmail ?? "" },
        theme: { color: "#004ac6" },
        handler: async (response: any) => {
          try {
            await apiClient("/api/razorpay/verify", {
              method: "POST",
              body: JSON.stringify({
                invoiceId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            router.refresh();
          } catch {
            setError(
              "Payment succeeded but verification failed — contact support."
            );
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      });

      rzp.open();
    } catch (err: any) {
      setError(err?.message ?? "Could not start payment");
      setLoading(false);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-lg flex items-center justify-between">
        <div>
          <p className="text-label-md text-on-surface-variant">Amount due</p>
          <p className="text-headline-md text-on-surface tabular-nums">{formatCurrency(amount, currency)}</p>
          {error && <p className="text-body-sm text-error mt-1">{error}</p>}
        </div>
        <button
          onClick={handlePay}
          disabled={loading}
          className="px-lg py-2.5 bg-primary-container text-on-primary-container rounded-lg text-label-md hover:bg-primary-container/90 transition-colors shadow-sm disabled:opacity-60"
        >
          {loading ? "Opening checkout…" : "Pay Now"}
        </button>
      </div>
    </>
  );
}
