import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [{ count: patientCount }, { count: todayApptCount }, { data: pendingInvoices }, { data: upcoming }] =
    await Promise.all([
      supabase.from("patients").select("id", { count: "exact", head: true }),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .gte("start_time", todayStart.toISOString())
        .lte("start_time", todayEnd.toISOString()),
      supabase.from("invoices").select("total").in("status", ["sent", "overdue"]),
      supabase
        .from("appointments")
        .select("id, start_time, reason, patients(full_name), profiles!appointments_doctor_id_fkey(full_name)")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(4),
    ]);

  const pendingTotal = (pendingInvoices ?? []).reduce((sum, i) => sum + Number(i.total), 0);

  const kpis = [
    { label: "Total Patients", value: patientCount ?? 0, icon: "group" },
    { label: "Today's Appointments", value: todayApptCount ?? 0, icon: "event" },
    { label: "Pending Invoices", value: formatCurrency(pendingTotal), icon: "payments" },
    { label: "Active Staff", value: "—", icon: "monitoring" },
  ];

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-headline-md text-on-surface mb-1">
            Welcome back, {profile?.full_name ?? "there"}
          </h1>
          <p className="text-body-sm text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined outline-icon text-[16px]">calendar_today</span>
            {formatDate(new Date())}
          </p>
        </div>
        <Link
          href="/appointments/new"
          className="px-5 py-2.5 bg-primary-container text-on-primary-container rounded-lg text-label-md flex items-center gap-2 hover:bg-primary-container/90 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">event_available</span>
          Book Appointment
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/50 shadow-sm flex flex-col justify-between h-32"
          >
            <div className="flex justify-between items-start">
              <p className="text-label-md text-on-surface-variant">{kpi.label}</p>
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">{kpi.icon}</span>
              </div>
            </div>
            <h3 className="text-headline-md text-on-surface tabular-nums">{kpi.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-headline-sm text-on-surface">Recent Patients</h3>
            <Link href="/patients" className="text-label-md text-primary hover:underline">
              View all
            </Link>
          </div>
          <PatientsPreview />
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-sm p-5 h-full">
          <h3 className="text-headline-sm text-on-surface mb-6">Upcoming Schedule</h3>
          <div className="space-y-4">
            {(upcoming ?? []).length === 0 && (
              <p className="text-body-sm text-on-surface-variant">No upcoming appointments.</p>
            )}
            {(upcoming ?? []).map((appt: any) => (
              <div
                key={appt.id}
                className="flex-1 bg-surface-container-low/50 p-3 rounded-lg border border-outline-variant/30 hover:border-primary/30 transition-colors"
              >
                <p className="text-label-md text-on-surface mb-0.5">{formatTime(appt.start_time)}</p>
                <p className="text-body-sm font-medium text-on-surface">{appt.patients?.full_name}</p>
                <p className="text-label-sm text-on-surface-variant mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">stethoscope</span>
                  Dr. {appt.profiles?.full_name}
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/appointments"
            className="w-full mt-6 py-2 border border-outline-variant rounded-lg text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors flex justify-center"
          >
            View Full Schedule
          </Link>
        </div>
      </div>
    </>
  );
}

async function PatientsPreview() {
  const supabase = createClient();
  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name, phone, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (!patients || patients.length === 0) {
    return (
      <p className="text-body-sm text-on-surface-variant py-6 text-center">
        No patients yet.{" "}
        <Link href="/patients/new" className="text-primary hover:underline">
          Add your first patient
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="divide-y divide-outline-variant/50">
      {patients.map((p) => (
        <Link
          key={p.id}
          href={`/patients/${p.id}`}
          className="flex items-center justify-between py-3 hover:bg-surface-container-low/30 transition-colors -mx-2 px-2 rounded"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center text-label-sm">
              {p.full_name.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-body-sm font-medium text-on-surface">{p.full_name}</span>
          </div>
          <span className="text-body-sm text-on-surface-variant">{p.phone}</span>
        </Link>
      ))}
    </div>
  );
}
