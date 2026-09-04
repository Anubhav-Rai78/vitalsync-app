import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";

export default function WorkflowDoc() {
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
            SOP-CLIN-001
          </span>
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Last Updated: September 2026
          </span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Clinical Workflow &amp; Patient Management Guide
        </h1>
        <p className="text-slate-500 text-lg border-b border-slate-200 pb-6">
          Applies To: Front Desk Personnel, Nursing Staff, Attending Physicians
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          1. Patient Intake and Registration
        </h2>
        <p className="leading-relaxed text-slate-700 mb-3">
          All patients, whether walk-in or pre-booked, must be registered in the
          MedFlow system before any clinical services are rendered.
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-700">
          <li><strong>Demographics:</strong> Capture full legal name, date of birth, biological sex, and current contact information.</li>
          <li><strong>Consent Forms:</strong> Ensure the digital &ldquo;Consent to Treat&rdquo; and &ldquo;Privacy Policy&rdquo; acknowledgments are signed via the patient portal or front desk tablet.</li>
          <li><strong>Identity Verification:</strong> A valid government-issued ID must be scanned and attached to the patient&apos;s profile on their first visit.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          2. Triage and Vital Signs
        </h2>
        <p className="leading-relaxed text-slate-700">
          Once registered, the appointment status must be updated to <strong>In Triage</strong>. Nursing staff will record the patient&apos;s chief complaint and baseline vitals (Blood Pressure, Heart Rate, Temperature, SpO2, and Weight) directly into the MedFlow triage module. Abnormal vitals will automatically flag the chart in red for the attending physician.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          3. Physician Consultation (SOAP Protocol)
        </h2>
        <p className="leading-relaxed text-slate-700 mb-3">
          All clinical encounters must be documented using the standard <strong>SOAP format</strong> to ensure medical and legal compliance:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-700">
          <li><strong>Subjective:</strong> Record the patient&apos;s own description of their symptoms, duration, and pain scale.</li>
          <li><strong>Objective:</strong> Document the physician&apos;s physical examination findings and review of the triage vitals.</li>
          <li><strong>Assessment:</strong> Apply the appropriate ICD-10 diagnostic codes. Primary and secondary diagnoses must be clearly distinguished.</li>
          <li><strong>Plan:</strong> Detail the treatment plan, including required rest, dietary restrictions, and follow-up timelines.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          4. E-Prescribing (Rx) and Lab Orders
        </h2>
        <p className="leading-relaxed text-slate-700 mb-3">
          Medications must be prescribed using the integrated pharmacy module.
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-700">
          <li>Always utilize the system&apos;s allergy-checker before finalizing a prescription.</li>
          <li>For external lab tests, generate a digital requisition form and transmit it directly to the partnered diagnostic center via the MedFlow HL7 integration.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
          5. Discharge and Handoff
        </h2>
        <p className="leading-relaxed text-slate-700">
          Upon completing the consultation, the physician must mark the chart as <strong>&ldquo;Completed&rdquo;</strong>. This action locks the clinical notes (preventing further edits without an audit trail) and automatically forwards the patient&apos;s digital file to the billing queue.
        </p>
      </section>
    </div>
  );
}
