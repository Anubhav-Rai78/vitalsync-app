import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function PatientProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: patient } = await supabase.from("patients").select("*").eq("id", params.id).single();
  if (!patient) notFound();

  const [{ data: appointments }, { data: prescriptions }, { data: invoices }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, start_time, status, reason, profiles!appointments_doctor_id_fkey(full_name)")
      .eq("patient_id", params.id)
      .order("start_time", { ascending: false })
      .limit(10),
    supabase
      .from("prescriptions")
      .select("id, diagnosis, created_at, profiles!prescriptions_doctor_id_fkey(full_name)")
      .eq("patient_id", params.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("invoices")
      .select("id, invoice_number, status, total, created_at")
      .eq("patient_id", params.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <div className="space-y-lg">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-headline-lg text-on-surface mb-1">{patient.full_name}</h1>
          <p className="text-body-sm text-on-surface-variant">
            {patient.sex ?? "—"} · {patient.phone ?? "no phone on file"} · {patient.email ?? "no email on file"}
          </p>
        </div>
        <Link
          href={`/appointments/new?patient=${patient.id}`}
          className="px-5 py-2.5 bg-primary-container text-on-primary-container rounded-lg text-label-md flex items-center gap-2 hover:bg-primary-container/90 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">event_available</span>
          Book Appointment
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-lg">
            <h2 className="text-headline-sm text-on-surface mb-md">Appointment History</h2>
            <div className="divide-y divide-outline-variant/50">
              {(appointments ?? []).map((a: any) => (
                <div key={a.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-body-sm font-medium text-on-surface">{a.reason ?? "Consultation"}</p>
                    <p className="text-label-sm text-on-surface-variant">Dr. {a.profiles?.full_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-body-sm text-on-surface-variant">{formatDate(a.start_time)}</p>
                    <span className="text-label-sm text-primary capitalize">{a.status}</span>
                  </div>
                </div>
              ))}
              {(!appointments || appointments.length === 0) && (
                <p className="text-body-sm text-on-surface-variant py-4">No appointments yet.</p>
              )}
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-lg">
            <h2 className="text-headline-sm text-on-surface mb-md">Prescriptions</h2>
            <div className="divide-y divide-outline-variant/50">
              {(prescriptions ?? []).map((p: any) => (
                <Link
                  key={p.id}
                  href={`/prescriptions/${p.id}`}
                  className="py-3 flex items-center justify-between hover:bg-surface-container-low/40 -mx-2 px-2 rounded transition-colors"
                >
                  <div>
                    <p className="text-body-sm font-medium text-on-surface">{p.diagnosis ?? "Prescription"}</p>
                    <p className="text-label-sm text-on-surface-variant">Dr. {p.profiles?.full_name}</p>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">{formatDate(p.created_at)}</p>
                </Link>
              ))}
              {(!prescriptions || prescriptions.length === 0) && (
                <p className="text-body-sm text-on-surface-variant py-4">No prescriptions on file.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-lg">
            <h2 className="text-headline-sm text-on-surface mb-md">Patient Info</h2>
            <dl className="space-y-3 text-body-sm">
              <div>
                <dt className="text-label-sm text-on-surface-variant uppercase tracking-wide">Date of Birth</dt>
                <dd className="text-on-surface">{patient.dob ? formatDate(patient.dob) : "—"}</dd>
              </div>
              <div>
                <dt className="text-label-sm text-on-surface-variant uppercase tracking-wide">Blood Group</dt>
                <dd className="text-on-surface">{patient.blood_group ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-label-sm text-on-surface-variant uppercase tracking-wide">Known Allergies</dt>
                <dd className="text-on-surface">{patient.allergies ?? "None recorded"}</dd>
              </div>
              <div>
                <dt className="text-label-sm text-on-surface-variant uppercase tracking-wide">Address</dt>
                <dd className="text-on-surface">{patient.address ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-label-sm text-on-surface-variant uppercase tracking-wide">Emergency Contact</dt>
                <dd className="text-on-surface">{patient.emergency_contact ?? "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-lg">
            <h2 className="text-headline-sm text-on-surface mb-md">Recent Invoices</h2>
            <div className="divide-y divide-outline-variant/50">
              {(invoices ?? []).map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="py-2 flex items-center justify-between text-body-sm hover:text-primary transition-colors"
                >
                  <span>{inv.invoice_number}</span>
                  <span className="tabular-nums">{formatCurrency(Number(inv.total))}</span>
                </Link>
              ))}
              {(!invoices || invoices.length === 0) && (
                <p className="text-body-sm text-on-surface-variant py-4">No invoices yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
