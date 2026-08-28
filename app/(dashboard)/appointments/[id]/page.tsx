import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime } from "@/lib/utils";
import { AppointmentStatusActions } from "@/components/modules/appointment-status-actions";

export default async function AppointmentDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "*, patients(id, full_name, phone, email), profiles!appointments_doctor_id_fkey(id, full_name, specialty)"
    )
    .eq("id", params.id)
    .single();

  if (!appt) notFound();
  const patient: any = appt.patients;
  const doctor: any = appt.profiles;

  return (
    <div className="max-w-2xl mx-auto space-y-lg">
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-lg">
        <div className="flex items-start justify-between mb-md">
          <div>
            <h1 className="text-headline-lg text-on-surface mb-1">{appt.reason ?? "Consultation"}</h1>
            <p className="text-body-sm text-on-surface-variant">
              {formatDate(appt.start_time)} · {formatTime(appt.start_time)} – {formatTime(appt.end_time)}
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-label-sm capitalize bg-primary-container/20 text-primary">
            {appt.status.replace("_", " ")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-md pt-md border-t border-outline-variant/50">
          <div>
            <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">Patient</p>
            <p className="text-body-sm text-on-surface font-medium">{patient?.full_name}</p>
            <p className="text-body-sm text-on-surface-variant">{patient?.phone}</p>
          </div>
          <div>
            <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">Provider</p>
            <p className="text-body-sm text-on-surface font-medium">Dr. {doctor?.full_name}</p>
            <p className="text-body-sm text-on-surface-variant">{doctor?.specialty}</p>
          </div>
        </div>

        {appt.notes && (
          <div className="mt-md pt-md border-t border-outline-variant/50">
            <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">Notes</p>
            <p className="text-body-sm text-on-surface">{appt.notes}</p>
          </div>
        )}
      </div>

      <AppointmentStatusActions appointmentId={appt.id} currentStatus={appt.status} />
    </div>
  );
}
