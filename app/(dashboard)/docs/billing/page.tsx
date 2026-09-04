import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";

export default function BillingDoc() {
  return (
    <div className="max-w-3xl mx-auto p-8 text-slate-800">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
            SOP-FIN-022
          </span>
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Last Updated: September 2026
          </span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Billing Operations &amp; Razorpay Reconciliation Protocol
        </h1>
        <p className="text-slate-500 text-lg border-b border-slate-200 pb-6">
          Applies To: Billing Department, Clinic Administrators
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          1. Invoice Generation
        </h2>
        <p className="leading-relaxed text-slate-700">
          Invoices are automatically drafted by the MedFlow billing engine once a
          clinical encounter is marked <strong>&ldquo;Completed.&rdquo;</strong>{" "}
          Billing staff must manually verify the draft, ensuring all consultation
          fees, consumed clinic supplies, and in-house pharmacy items are
          accurately line-itemized before publishing the final bill.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          2. Payment Collection via Razorpay
        </h2>
        <p className="leading-relaxed text-slate-700 mb-3">
          MedFlow is fully integrated with Razorpay to handle all digital
          transactions securely.
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-700">
          <li><strong>In-Clinic Checkout:</strong> Use the MedFlow payment terminal to accept UPI, Credit/Debit Cards, and Netbanking.</li>
          <li><strong>Telehealth / Remote Payments:</strong> Generate a Razorpay Payment Link directly from the invoice screen. The system will automatically SMS and email the secure link to the patient.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          3. Transaction Finality and Webhooks
        </h2>
        <p className="leading-relaxed text-slate-700 mb-3">
          Do not close the payment window or refresh the page until the green{" "}
          <strong>&ldquo;Payment Successful&rdquo;</strong> confirmation appears.
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-700">
          <li>MedFlow relies on backend webhooks from Razorpay to mark invoices as <em>&ldquo;Paid.&rdquo;</em></li>
          <li><strong>Pending States:</strong> If a patient reports that money was deducted from their bank but the invoice still reads &ldquo;Pending,&rdquo; do not collect payment again. Instruct the patient to wait 5 to 10 minutes. The Razorpay webhook fallback job will automatically reconcile the delayed transaction and update the receipt.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          4. End-of-Day (EOD) Reconciliation
        </h2>
        <p className="leading-relaxed text-slate-700">
          At 8:00 PM IST daily, the Lead Biller must run the MedFlow EOD Financial Report and cross-reference the total settled amount with the Razorpay Merchant Dashboard. Any discrepancies (e.g., chargebacks or dropped network packets) must be logged in the discrepancy ledger.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          5. Refund Policy
        </h2>
        <p className="leading-relaxed text-slate-700">
          To maintain strict financial auditing, refunds cannot be initiated from the MedFlow UI. If a patient is overcharged or requests a valid cancellation refund, the Clinic Administrator must log directly into the Razorpay Dashboard, locate the specific Transaction ID (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-[12px] font-mono">pay_XXXXX</code>), and initiate the partial or full refund there.
        </p>
      </section>
    </div>
  );
}

