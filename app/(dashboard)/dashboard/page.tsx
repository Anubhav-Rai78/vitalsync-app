import React from "react";
import { formatDateIST, formatTimeIST, getISTMonthStart, getISTMonthEnd } from "@/lib/date";
import { Calendar, Users, CalendarCheck, Plus, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WeeklyActivityChart } from "@/components/modules/weekly-activity-chart";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch the user's profile (full_name, role, clinic_id)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, clinic_id")
    .eq("id", user.id)
    .single();

  const clinicId = profile?.clinic_id ?? "";
  const userGreetingName = profile?.full_name || user.email?.split("@")[0] || "Doctor";

  // 2. Total patients count
  const { count: patientCount } = await supabase
    .from("patients")
    .select("*", { count: "exact", head: true })
    .eq("clinic_id", clinicId);

  // 3. Today's appointments
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: todayAppointments } = await supabase
    .from("appointments")
    .select(
      "id, start_time, status, reason, patients(full_name), profiles!appointments_doctor_id_fkey(full_name)"
    )
    .eq("clinic_id", clinicId)
    .gte("start_time", todayStart.toISOString())
    .lte("start_time", todayEnd.toISOString())
    .order("start_time", { ascending: true });

  // 4. Pending invoices (sent + overdue)
  const { data: pendingInvoices } = await supabase
    .from("invoices")
    .select("total")
    .eq("clinic_id", clinicId)
    .in("status", ["sent", "overdue"]);

  const pendingCount = pendingInvoices?.length || 0;
  const pendingAmount = pendingInvoices?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0;

  // 5. Monthly revenue (paid invoices created this IST calendar month)
  const monthStart = getISTMonthStart().toISOString();
  const monthEnd = getISTMonthEnd().toISOString();
  const { data: paidInvoices } = await supabase
    .from("invoices")
    .select("total")
    .eq("clinic_id", clinicId)
    .eq("status", "paid")
    .gte("created_at", monthStart)
    .lte("created_at", monthEnd);

  const monthlyRevenue = paidInvoices?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0;

  // 6. Recent patients (last 5 by creation date)
  const { data: recentPatients } = await supabase
    .from("patients")
    .select("id, full_name, sex, phone, created_at")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false })
    .limit(5);

  // 7. Clinic activity for the last 7 days (appointments per day)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const { data: weekAppointments } = await supabase
    .from("appointments")
    .select("start_time")
    .eq("clinic_id", clinicId)
    .gte("start_time", weekStart.toISOString());

  const activityData = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    return { day: formatDateIST(day, { weekday: "short" }), appointments: 0 };
  });

  (weekAppointments ?? []).forEach((appt) => {
    const dayKey = formatDateIST(new Date(appt.start_time), { weekday: "short" });
    const entry = activityData.find((a) => a.day === dayKey);
    if (entry) entry.appointments += 1;
  });
const currentDateFormatted = formatDateIST(new Date(), { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* Dynamic Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface tracking-tight">
            Welcome back, {userGreetingName}
          </h1>
          <p className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-1 font-medium">
            <Calendar className="w-3.5 h-3.5 text-on-surface-variant" />
            {currentDateFormatted}
          </p>
        </div>

        <Button asChild className="bg-primary-container text-on-primary hover:brightness-95 font-semibold text-xs px-4 py-2 rounded-lg shadow-sm">
          <Link href="/appointments?book=true" className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Book Appointment
          </Link>
        </Button>
      </div>

      {/* Live KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Patients */}
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-semibold text-on-surface-variant">Total Patients</span>
            <div className="w-7 h-7 rounded-lg bg-primary-fixed/20 text-primary flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-on-surface">{patientCount || 0}</div>
            <span className="text-[11px] font-semibold text-secondary flex items-center gap-1 mt-0.5">
              ↑ Live count
            </span>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-semibold text-on-surface-variant">Today's Appointments</span>
            <div className="w-7 h-7 rounded-lg bg-tertiary-fixed/20 text-tertiary flex items-center justify-center">
              <CalendarCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-on-surface">{todayAppointments?.length || 0}</div>
            <span className="text-[11px] font-medium text-on-surface-variant mt-0.5 block">Active schedule</span>
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-semibold text-on-surface-variant">Pending Invoices</span>
            <div className="w-7 h-7 rounded-lg bg-error-container/40 text-error flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-on-surface">
              ₹{pendingAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] font-semibold text-error flex items-center gap-1 mt-0.5">
              {pendingCount > 0 ? `${pendingCount} require follow-up` : "All settled"}
            </span>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-semibold text-on-surface-variant">Monthly Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-secondary-container/20 text-secondary flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-on-surface">
              ₹{monthlyRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] font-semibold text-secondary flex items-center gap-1 mt-0.5">
              ↑ This month
            </span>
          </div>
        </div>
      </div>
{/* Live Recent Patients & Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Patients Table */}
        <div className="lg:col-span-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-on-surface">Recent Patients</h3>
            <Link href="/patients" className="text-xs font-semibold text-primary hover:underline">
              View All
            </Link>
          </div>

          {recentPatients && recentPatients.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase font-bold text-on-surface-variant border-b border-outline-variant">
                <tr>
                  <th className="pb-3">Patient Name</th>
                  <th className="pb-3">Sex</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3 text-right">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {recentPatients.map((p) => {
                  const initials = p.full_name ? p.full_name.slice(0, 2).toUpperCase() : "PT";
                  const registeredTime = p.created_at ? formatTimeIST(p.created_at) : "—";

                  return (
                    <tr key={p.id} className="hover:bg-surface-container-low/50">
                      <td className="py-3 font-semibold text-on-surface flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-[10px] font-bold">
                          {initials}
                        </div>
                        <Link href={`/patients/${p.id}`} className="hover:underline">
                          {p.full_name}
                        </Link>
                      </td>
                      <td className="py-3 text-on-surface-variant capitalize">{p.sex ?? "—"}</td>
                      <td className="py-3 font-medium text-on-surface-variant">{p.phone ?? "—"}</td>
                      <td className="py-3 text-right font-medium text-on-surface-variant">{registeredTime}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-xs text-on-surface-variant">
              No registered patients found in database.
            </div>
          )}
        </div>

        {/* Live Upcoming Schedule */}
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-on-surface mb-4">Upcoming Schedule</h3>

            {todayAppointments && todayAppointments.length > 0 ? (
              <div className="space-y-3">
                {todayAppointments.slice(0, 4).map((slot, idx) => {
                  const appointmentTime = slot.start_time
                    ? formatTimeIST(slot.start_time)
                    : "Scheduled";
                  const patientName = (slot as any).patients?.full_name || "Patient";
                  const doctorName = (slot as any).profiles?.full_name || "Attending Physician";

                  return (
                    <div key={slot.id || idx} className="flex items-start gap-3 p-2.5 rounded-lg border border-outline-variant bg-surface-container-low/50">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${idx === 0 ? "bg-primary" : "bg-outline-variant"}`} />
                      <div className="text-xs">
                        <span className="font-bold text-on-surface block">{appointmentTime}</span>
                        <span className="text-on-surface font-medium">{patientName}</span>
                        <span className="text-[11px] text-on-surface-variant block">
                          🩺 Dr. {doctorName}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-on-surface-variant">
                No appointments scheduled for today.
              </div>
            )}
          </div>

          <Button variant="secondary" size="sm" asChild className="w-full mt-4 text-xs font-semibold">
            <Link href="/appointments">View Full Schedule</Link>
          </Button>
        </div>
      </div>
      {/* Clinic Activity Chart (last 7 days — live data) */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-on-surface">Clinic Activity (Last 7 Days)</h3>
          <div className="flex items-center gap-4 text-xs font-semibold text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Appointments
            </span>
          </div>
        </div>

        <WeeklyActivityChart data={activityData} />
      </div>
    </div>
  );
}