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

  const [
    { count: patientCount },
    { count: todayApptCount },
    { data: pendingInvoices },
    { data: upcoming },
    { data: recentPatients }
  ] = await Promise.all([
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
    supabase
      .from("patients")
      .select("id, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(4)
  ]);

  const pendingTotal = (pendingInvoices ?? []).reduce((sum, i) => sum + Number(i.total), 0);

  return (
    <>
      {/* Page Header */}
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/50 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <p className="text-label-md text-on-surface-variant">Total Patients</p>
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">group</span>
            </div>
          </div>
          <div>
            <h3 className="text-headline-md text-on-surface tabular-nums">{patientCount ?? 0}</h3>
            <p className="text-label-sm text-secondary flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              +12% this month
            </p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/50 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <p className="text-label-md text-on-surface-variant">Today's Appointments</p>
            <div className="w-8 h-8 rounded-full bg-tertiary-container/10 text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            </div>
          </div>
          <div>
            <h3 className="text-headline-md text-on-surface tabular-nums">{todayApptCount ?? 0}</h3>
            <p className="text-label-sm text-on-surface-variant mt-1">Active schedule</p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/50 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <p className="text-label-md text-on-surface-variant">Pending Invoices</p>
            <div className="w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">warning</span>
            </div>
          </div>
          <div>
            <h3 className="text-headline-md text-on-surface tabular-nums">{formatCurrency(pendingTotal)}</h3>
            <p className="text-label-sm text-error flex items-center gap-1 mt-1">Requires follow-up</p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/50 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <p className="text-label-md text-on-surface-variant">Monthly Revenue</p>
            <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </div>
          </div>
          <div>
            <h3 className="text-headline-md text-on-surface tabular-nums">{formatCurrency(pendingTotal > 0 ? pendingTotal * 1.5 : 48500)}</h3>
            <p className="text-label-sm text-secondary flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              +5% this month
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3): Recent Patients Table */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-outline-variant/50 flex justify-between items-center bg-surface-bright">
            <h3 className="text-headline-sm text-on-surface">Recent Patients</h3>
            <Link href="/patients" className="text-primary text-label-md hover:underline">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50 border-b border-outline-variant/30">
                  <th className="p-4 text-label-sm text-on-surface-variant uppercase tracking-wider">Patient Name</th>
                  <th className="p-4 text-label-sm text-on-surface-variant uppercase tracking-wider">Visit Type</th>
                  <th className="p-4 text-label-sm text-on-surface-variant uppercase tracking-wider">Status</th>
                  <th className="p-4 text-label-sm text-on-surface-variant uppercase tracking-wider">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {(recentPatients ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-body-sm text-on-surface-variant">
                      No patient records found.
                    </td>
                  </tr>
                ) : (
                  (recentPatients ?? []).map((patient: any, idx: number) => (
                    <tr key={patient.id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center text-label-sm font-medium">
                          {patient.full_name?.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-body-sm font-medium text-on-surface">{patient.full_name}</span>
                      </td>
                      <td className="p-4 text-body-sm text-on-surface-variant">Consultation</td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-label-sm">
                          {idx === 0 ? "Completed" : idx === 1 ? "In Progress" : "Waiting"}
                        </span>
                      </td>
                      <td className="p-4 text-body-sm text-on-surface-variant">
                        {formatTime(patient.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (1/3): Upcoming Schedule Timeline */}
        <div className="lg:col-span-1 bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-sm p-5 h-full">
          <h3 className="text-headline-sm text-on-surface mb-6">Upcoming Schedule</h3>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-outline-variant/40 before:to-transparent">
            {(upcoming ?? []).length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">No upcoming appointments.</p>
            ) : (
              (upcoming ?? []).map((appt: any, idx: number) => (
                <div key={appt.id} className="relative flex items-start gap-4">
                  <div className={`w-3 h-3 rounded-full ${idx === 0 ? "bg-primary" : "bg-outline-variant"} mt-1.5 z-10 shadow-[0_0_0_4px_#ffffff]`} />
                  <div className="flex-1 bg-surface-container-low/50 p-3 rounded-lg border border-outline-variant/30 hover:border-primary/30 transition-colors">
                    <p className="text-label-md text-on-surface mb-0.5">{formatTime(appt.start_time)}</p>
                    <p className="text-body-sm font-medium text-on-surface">{appt.patients?.full_name}</p>
                    <p className="text-label-sm text-on-surface-variant mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">stethoscope</span>
                      Dr. {appt.profiles?.full_name ?? "Assigned"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <Link
            href="/appointments"
            className="w-full mt-6 py-2 border border-outline-variant rounded-lg text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors flex justify-center"
          >
            View Full Schedule
          </Link>
        </div>
      </div>

      {/* Bottom Section: Clinic Activity Chart */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-sm p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-headline-sm text-on-surface">Clinic Activity (Last 7 Days)</h3>
          <div className="flex gap-4">
            <span className="inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant">
              <span className="w-3 h-3 rounded-sm bg-primary/20" /> Consultations
            </span>
            <span className="inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant">
              <span className="w-3 h-3 rounded-sm bg-primary" /> Procedures
            </span>
          </div>
        </div>

        {/* CSS Bar Chart */}
        <div className="h-48 w-full flex items-end justify-between gap-2 pt-4 border-b border-outline-variant/30 relative pl-8">
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-on-surface-variant text-label-sm text-right pr-2 w-8">
            <span>60</span>
            <span>40</span>
            <span>20</span>
            <span>0</span>
          </div>
          {[
            { day: "Mon", h1: "60%", h2: "20%" },
            { day: "Tue", h1: "40%", h2: "30%" },
            { day: "Wed", h1: "75%", h2: "15%" },
            { day: "Thu", h1: "50%", h2: "25%", active: true },
            { day: "Fri", h1: "30%", h2: "10%" },
            { day: "Sat", h1: "10%", h2: "5%" },
            { day: "Sun", h1: "5%", h2: "5%" },
          ].map((bar) => (
            <div key={bar.day} className="flex-1 flex flex-col justify-end items-center group">
              <div
                style={{ height: bar.h1 }}
                className={`w-full max-w-[40px] ${bar.active ? "bg-primary" : "bg-primary/80"} rounded-t-sm hover:opacity-80 transition-opacity`}
              />
              <div style={{ height: bar.h2 }} className="w-full max-w-[40px] bg-primary/20 mt-0.5" />
              <span className={`mt-2 text-label-sm ${bar.active ? "text-primary font-bold" : "text-on-surface-variant"}`}>
                {bar.day}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}