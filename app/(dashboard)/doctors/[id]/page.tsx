import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime } from "@/lib/utils";

export default async function DoctorProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: doctor } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .eq("role", "doctor")
    .single();
  if (!doctor) notFound();

  const { data: upcoming } = await supabase
    .from("appointments")
    .select("id, start_time, reason, status, patients(full_name)")
    .eq("doctor_id", params.id)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(8);

  return (
    <div className="space-y-lg">
      <div className="flex items-center gap-4">
        {doctor.avatar_url ? (
          <img src={doctor.avatar_url} alt={doctor.full_name} className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-headline-md">
            {doctor.full_name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-headline-lg text-on-surface">Dr. {doctor.full_name}</h1>
          <p className="text-body-sm text-on-surface-variant">
            {doctor.specialty ?? "General Practice"} {doctor.license_no ? `· Lic. ${doctor.license_no}` : ""}
          </p>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-lg">
        <h2 className="text-headline-sm text-on-surface mb-md">Upcoming Schedule</h2>
        <div className="divide-y divide-outline-variant/50">
          {(upcoming ?? []).map((a: any) => (
            <div key={a.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="text-body-sm font-medium text-on-surface">{a.patients?.full_name}</p>
                <p className="text-label-sm text-on-surface-variant">{a.reason ?? "Consultation"}</p>
              </div>
              <div className="text-right">
                <p className="text-body-sm text-on-surface-variant">{formatDate(a.start_time)}</p>
                <p className="text-label-sm text-primary">{formatTime(a.start_time)}</p>
              </div>
            </div>
          ))}
          {(!upcoming || upcoming.length === 0) && (
            <p className="text-body-sm text-on-surface-variant py-4">No upcoming appointments scheduled.</p>
          )}
        </div>
      </div>
    </div>
  );
}
