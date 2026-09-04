import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";

export default function ComplianceDoc() {
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
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
            SOP-SEC-099
          </span>
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Last Updated: September 2026
          </span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Security Protocols &amp; HIPAA Compliance Manual
        </h1>
        <p className="text-slate-500 text-lg border-b border-slate-200 pb-6">
          Applies To: All MedFlow System Users (Clinical and Administrative)
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          1. Core Privacy Mandate (PHI Handling)
        </h2>
        <p className="leading-relaxed text-slate-700">
          Protected Health Information (PHI) includes any data that can identify a patient (names, phone numbers, medical conditions, billing details). Under strict healthcare compliance laws, PHI may only be accessed on a <strong>&ldquo;need-to-know&rdquo; basis</strong> to perform specific job duties. Unauthorized viewing of patient records is grounds for immediate termination.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          2. Role-Based Access Control (RBAC)
        </h2>
        <p className="leading-relaxed text-slate-700 mb-3">
          Your MedFlow account is provisioned with specific permissions based on your job title:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-700">
          <li><strong>Front Desk:</strong> Can view schedules, basic demographics, and billing statuses. Cannot view clinical notes or diagnoses.</li>
          <li><strong>Physicians/Nurses:</strong> Can view and edit clinical notes, vitals, and histories.</li>
          <li><strong>Administrators:</strong> Can view systemic data and financial reports, but clinical chart access requires secondary authentication.</li>
        </ul>
        <p className="mt-3 leading-relaxed text-slate-700">
          <strong>Account Sharing:</strong> Sharing your username and password with another staff member is strictly prohibited.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          3. Workstation Security and Session Management
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-slate-700">
          <li>
            <strong>Screen Locking:</strong> You must lock your terminal whenever you step away from the desk, even for a moment.{" "}
            <kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[12px] font-mono text-slate-600">Win + L</kbd>{" "}
            <kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[12px] font-mono text-slate-600">Cmd + Ctrl + Q</kbd>
          </li>
          <li><strong>Auto-Timeout:</strong> For compliance, MedFlow will automatically log you out after 30 minutes of inactivity. Any unsaved drafts may be lost.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          4. Immutable Audit Trails
        </h2>
        <p className="leading-relaxed text-slate-700">
          Be advised that MedFlow records a permanent, unalterable audit log of every action taken in the system. The system logs your User ID, IP address, exact timestamp, and the specific data you viewed, created, modified, or deleted. These logs are routinely reviewed by the IT compliance officer.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          5. Incident Reporting
        </h2>
        <p className="leading-relaxed text-slate-700">
          If you suspect a data breach, notice a compromised password, or accidentally disclose PHI to an unauthorized party, you must immediately halt use of the system and report the incident via the <strong>Support / Ticket Desk</strong> using the &ldquo;Critical / Clinic Blocker&rdquo; severity tag.
        </p>
      </section>
    </div>
  );
}
