// ─── Reporting Service ───────────────────────────────────────────────────────
// Aggregates dashboard KPIs and report datasets from the underlying tables.
// Like all services, it never constructs its own client — the caller passes an
// authenticated Supabase client. Empty states return zeroed fallback objects
// rather than throwing, so pages render friendly empty states with no errors.
// ──────────────────────────────────────────────────────────────────────────────

import { DatabaseError, getUserFacingMessage } from "@/lib/errors";
import type { DashboardStats, RevenueRow, SupabaseClient } from "./types";
import { EMPTY_DASHBOARD_STATS } from "./types";

/**
 * Compute the clinic's dashboard KPI card numbers for the current month.
 *
 * @param client Authenticated Supabase client
 * @param clinicId The clinic the user belongs to
 * @param monthStart ISO timestamp for the start of the current month
 * @param monthEnd ISO timestamp for the end of the current month
 */
export async function getDashboardStats(
  client: SupabaseClient,
  clinicId: string,
  monthStart: string,
  monthEnd: string,
): Promise<DashboardStats> {
  const stats = { ...EMPTY_DASHBOARD_STATS };

  try {
    // Patients (all-time)
    const { count: patientCount, error: patientErr } = await client
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId);
    if (!patientErr) stats.totalPatients = patientCount ?? 0;

    // Appointments (all-time)
    const { count: appointmentCount, error: apptErr } = await client
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId);
    if (!apptErr) stats.totalAppointments = appointmentCount ?? 0;

    // Upcoming appointments (today and later, still scheduled/confirmed)
    const { count: upcomingCount, error: upcomingErr } = await client
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .in("status", ["scheduled", "confirmed"])
      .gte("start_time", new Date().toISOString());
    if (!upcomingErr) stats.upcomingAppointments = upcomingCount ?? 0;

    // Pending invoices (sent or overdue)
    const { count: pendingCount, error: pendingErr } = await client
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .in("status", ["sent", "overdue"]);
    if (!pendingErr) stats.pendingInvoices = pendingCount ?? 0;

    // Monthly revenue (paid invoices in the current month)
    const { data: monthInvoices, error: monthErr } = await client
      .from("invoices")
      .select("total")
      .eq("clinic_id", clinicId)
      .eq("status", "paid")
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd);
    if (!monthErr) {
      stats.monthlyRevenue = (monthInvoices ?? []).reduce((sum, inv) => sum + inv.total, 0);
    }
  } catch {
    // Deliberately swallow per-metric errors and return whatever we did compute.
    // The dashboard should never crash because one metric fails.
  }

  return stats;
}

/**
 * Build a 6-month revenue trend series for the reports charts.
 * Months are labelled "MMM" (e.g. "Sep", "Oct") in IST.
 * Returns zeroed rows for every month in the window when no paid invoices exist.
 */
export async function getRevenueReport(
  client: SupabaseClient,
  clinicId: string,
  months: Array<{ key: string; from: string; to: string; label: string }>,
): Promise<RevenueRow[]> {
  const rows: RevenueRow[] = months.map((m) => ({
    month: m.label,
    revenue: 0,
    invoices: 0,
  }));

  try {
    for (let i = 0; i < months.length; i++) {
      const m = months[i];
      const { data, error } = await client
        .from("invoices")
        .select("total")
        .eq("clinic_id", clinicId)
        .eq("status", "paid")
        .gte("created_at", m.from)
        .lte("created_at", m.to);

      if (!error) {
        const paid = data ?? [];
        rows[i].revenue = paid.reduce((sum, inv) => sum + inv.total, 0);
        rows[i].invoices = paid.length;
      }
    }
  } catch {
    // Return zeroed rows — empty report state is handled by the UI.
  }

  return rows;
}

/**
 * Fetch a generic count of appointments grouped by status — used by the
 * operational report to show pipeline health.
 */
export async function getAppointmentStatusBreakdown(
  client: SupabaseClient,
  clinicId: string,
): Promise<Record<string, number>> {
  const { data, error } = await client
    .from("appointments")
    .select("status")
    .eq("clinic_id", clinicId);

  if (error) {
    throw new DatabaseError(getUserFacingMessage(error, "Failed to load appointment breakdown."), { cause: error });
  }

  const counts: Record<string, number> = { scheduled: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0 };
  for (const row of data ?? []) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}
