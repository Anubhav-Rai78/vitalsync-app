import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function PrescriptionDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: prescription } = await supabase
    .from("prescriptions")
    .select("*, patients(full_name, dob, allergies), profiles!prescriptions_doctor_id_fkey(full_name, license_no)")
    .eq("id", params.id)
    .single();

  if (!prescription) notFound();

  const { data: items } = await supabase
    .from("prescription_items")
    .select("*")
    .eq("prescription_id", params.id);

  const patient: any = prescription.patients;
  const doctor: any = prescription.profiles;

  return (
    <div className="max-w-2xl mx-auto space-y-lg">
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-lg">
        <div className="flex items-start justify-between mb-md">
          <div>
            <h1 className="text-headline-lg text-on-surface mb-1">{prescription.diagnosis ?? "Prescription"}</h1>
            <p className="text-body-sm text-on-surface-variant">{formatDate(prescription.created_at)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-md pt-md border-t border-outline-variant/50 mb-md">
          <div>
            <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">Patient</p>
            <p className="text-body-sm text-on-surface font-medium">{patient?.full_name}</p>
            {patient?.allergies && (
              <p className="text-label-sm text-error mt-1">Allergies: {patient.allergies}</p>
            )}
          </div>
          <div>
            <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">Prescribed by</p>
            <p className="text-body-sm text-on-surface font-medium">Dr. {doctor?.full_name}</p>
            {doctor?.license_no && <p className="text-body-sm text-on-surface-variant">Lic. {doctor.license_no}</p>}
          </div>
        </div>

        <div className="pt-md border-t border-outline-variant/50">
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-2">Medications</p>
          <div className="space-y-2">
            {(items ?? []).map((item) => (
              <div key={item.id} className="p-3 rounded-lg bg-surface-container-low/50">
                <p className="text-body-sm font-medium text-on-surface">{item.drug_name}</p>
                <p className="text-label-sm text-on-surface-variant">
                  {[item.dosage, item.frequency, item.duration].filter(Boolean).join(" · ")}
                </p>
                {item.instructions && (
                  <p className="text-label-sm text-on-surface-variant mt-1">{item.instructions}</p>
                )}
              </div>
            ))}
            {(!items || items.length === 0) && (
              <p className="text-body-sm text-on-surface-variant">No medications listed.</p>
            )}
          </div>
        </div>

        {prescription.notes && (
          <div className="mt-md pt-md border-t border-outline-variant/50">
            <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">Notes</p>
            <p className="text-body-sm text-on-surface">{prescription.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
