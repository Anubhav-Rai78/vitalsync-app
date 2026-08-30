import React from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
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

  // 5. Monthly revenue (paid invoices created this calendar month)
  const monthStart = startOfMonth(new Date()).toISOString();
  const monthEnd = endOfMonth(new Date()).toISOString();
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
    return { day: format(day, "EEE"), appointments: 0 };
  });

  (weekAppointments ?? []).forEach((appt) => {
    const dayKey = format(new Date(appt.start_time), "EEE");
    const entry = activityData.find((a) => a.day === dayKey);
    if (entry) entry.appointments += 1;
  });
const currentDateFormatted = format(new Date(), "EEEE, MMMM d, yyyy");

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* Dynamic Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Welcome back, {userGreetingName}
          </h1>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {currentDateFormatted}
          </p>
        </div>

        <Button asChild className="bg-[#2563eb] hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-sm">
          <Link href="/appointments?book=true" className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Book Appointment
          </Link>
        </Button>
      </div>

      {/* Live KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Patients */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold text-slate-600">Total Patients</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2563eb] flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">{patientCount || 0}</div>
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
              ↑ Live count
            </span>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold text-slate-600">Today's Appointments</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <CalendarCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">{todayAppointments?.length || 0}</div>
            <span className="text-[11px] font-medium text-slate-500 mt-0.5 block">Active schedule</span>
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold text-slate-600">Pending Invoices</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">
              ₹{pendingAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-0.5">
              {pendingCount > 0 ? `${pendingCount} require follow-up` : "All settled"}
            </span>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold text-slate-600">Monthly Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">
              ₹{monthlyRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
              ↑ This month
            </span>
          </div>
        </div>
      </div>
{/* Live Recent Patients & Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Patients Table */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Recent Patients</h3>
            <Link href="/patients" className="text-xs font-semibold text-[#2563eb] hover:underline">
              View All
            </Link>
          </div>

          {recentPatients && recentPatients.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase font-bold text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="pb-3">Patient Name</th>
                  <th className="pb-3">Sex</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3 text-right">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPatients.map((p) => {
                  const initials = p.full_name ? p.full_name.slice(0, 2).toUpperCase() : "PT";
                  const registeredTime = p.created_at ? format(new Date(p.created_at), "hh:mm a") : "—";

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-semibold text-slate-800 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
                          {initials}
                        </div>
                        <Link href={`/patients/${p.id}`} className="hover:underline">
                          {p.full_name}
                        </Link>
                      </td>
                      <td className="py-3 text-slate-600 capitalize">{p.sex ?? "—"}</td>
                      <td className="py-3 font-medium text-slate-500">{p.phone ?? "—"}</td>
                      <td className="py-3 text-right font-medium text-slate-500">{registeredTime}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              No registered patients found in database.
            </div>
          )}
        </div>

        {/* Live Upcoming Schedule */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-4">Upcoming Schedule</h3>

            {todayAppointments && todayAppointments.length > 0 ? (
              <div className="space-y-3">
                {todayAppointments.slice(0, 4).map((slot, idx) => {
                  const appointmentTime = slot.start_time
                    ? format(new Date(slot.start_time), "h:mm a")
                    : "Scheduled";
                  const patientName = (slot as any).patients?.full_name || "Patient";
                  const doctorName = (slot as any).profiles?.full_name || "Attending Physician";

                  return (
                    <div key={slot.id || idx} className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${idx === 0 ? "bg-[#2563eb]" : "bg-slate-300"}`} />
                      <div className="text-xs">
                        <span className="font-bold text-slate-900 block">{appointmentTime}</span>
                        <span className="text-slate-700 font-medium">{patientName}</span>
                        <span className="text-[11px] text-slate-400 block">
                          🩺 Dr. {doctorName}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-slate-400">
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
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900">Clinic Activity (Last 7 Days)</h3>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#2563eb]" /> Appointments
            </span>
          </div>
        </div>

        <WeeklyActivityChart data={activityData} />
      </div>
    </div>
  );
}