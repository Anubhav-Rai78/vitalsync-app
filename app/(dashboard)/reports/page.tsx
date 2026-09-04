"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, subMonths } from "date-fns";
import { formatDateIST, formatDateTimeIST, getISTMonthStart, getISTMonthEnd } from "@/lib/date";
import { PDFDocument, serializeCSV, downloadCSV, formatINRAmount } from "@/lib/document-engine";
import { createClient } from "@/lib/supabase/client";

/** IST-aware month label helper (matches the format used to bucket invoices). */
function monthLabelFor(date: Date): string {
  return formatDateIST(date.toISOString(), { month: "short" });
}

const revenue6M = Array.from({ length: 6 }, (_, i) => {
  const d = subMonths(new Date(), 5 - i);
  return { month: monthLabelFor(d), revenue: 0 };
});
const revenue1Y = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), 11 - i);
  return { month: monthLabelFor(d), revenue: 0 };
});
const SPECIALTY_COLORS: Record<string, string> = {
  Cardiology: "#2563eb",
  Pediatrics: "#006c49",
  "General Medicine": "#005e6e",
  Neurology: "#b4c5ff",
  Orthopedics: "#6cf8bb",
};
const DEFAULT_COLOR = "#0ea5e9";
/** Fallback palette for specialties not present in SPECIALTY_COLORS. */
const SPECIALTY_FALLBACK_PALETTE = ["#2563eb", "#7c3aed", "#0ea5e9", "#059669", "#d97706", "#dc2626", "#0d9488", "#9333ea"];
/** Whether to render specialty names on the XAxis (toggle flag). */
const SHOW_SPECIALTY_X_AXIS = true;

/** Deterministic color lookup — known specialties use their brand color, everything else cycles the fallback palette by sort order. */
function getSpecialtyColor(specialty: string, index: number): string {
  return SPECIALTY_COLORS[specialty] ?? SPECIALTY_FALLBACK_PALETTE[index % SPECIALTY_FALLBACK_PALETTE.length];
}

type PresetType = "monthly_financial" | "patient_demographics" | "staff_productivity" | "insurance_claims";

/** Preset configs keyed by PresetType — data, titles, date ranges, fallback rows. */
const PRESET_CONFIG: Record<PresetType, { title: string; fileStem: string; getDateRange: () => { startIso: string; endIso: string; label: string }; fallback: Record<string, string | number>[] }> = {
  monthly_financial: {
    title: "Monthly Financial Summary",
    fileStem: "monthly-financial-summary",
    getDateRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startIso: start.toISOString(), endIso: now.toISOString(), label: `${format(start, "MMM d, yyyy")} - ${format(now, "MMM d, yyyy")}` };
    },
    fallback: [
      { Metric: "Invoices Issued", Value: "24" },
      { Metric: "Paid Invoices", Value: "19" },
      { Metric: "Revenue Collected", Value: "INR 48,500.00" },
      { Metric: "Outstanding Balance", Value: "INR 9,200.00" },
      { Metric: "Average Ticket Size", Value: "INR 2,552.63" },
      { Metric: "Reporting Period", Value: "Current month-to-date" },
    ],
  },
  patient_demographics: {
    title: "Patient Demographics Overview",
    fileStem: "patient-demographics-overview",
    getDateRange: () => {
      const now = new Date();
      return { startIso: "2000-01-01T00:00:00.000Z", endIso: now.toISOString(), label: "All records up to " + format(now, "MMM d, yyyy") };
    },
    fallback: [
      { Metric: "Total Registered Patients", Value: "32" },
      { Metric: "Male Patients", Value: "17" },
      { Metric: "Female Patients", Value: "14" },
      { Metric: "Documented Allergies", Value: "6" },
      { Metric: "Age 0-18", Value: "8" },
      { Metric: "Age 19-50", Value: "18" },
      { Metric: "Age 51+", Value: "7" },
      { Metric: "Reporting Period", Value: "All records up to today" },
    ],
  },
  staff_productivity: {
    title: "Staff Productivity Analysis",
    fileStem: "staff-productivity-analysis",
    getDateRange: () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { startIso: start.toISOString(), endIso: now.toISOString(), label: `${format(start, "MMM d, yyyy")} - ${format(now, "MMM d, yyyy")}` };
    },
    fallback: [
      { Metric: "Total Scheduled Appointments", Value: "18" },
      { Metric: "Completed Consultations", Value: "14" },
      { Metric: "Completion Rate", Value: "78%" },
      { Metric: "Average Consultation Time", Value: "18 mins" },
      { Metric: "No-Show Rate", Value: "22%" },
      { Metric: "Reporting Period", Value: "Last 30 days" },
    ],
  },
  insurance_claims: {
    title: "Insurance Claim Performance",
    fileStem: "insurance-claim-performance",
    getDateRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      return { startIso: start.toISOString(), endIso: now.toISOString(), label: `${format(start, "MMM d, yyyy")} - ${format(now, "MMM d, yyyy")}` };
    },
    fallback: [
      { Metric: "Claims Submitted", Value: "147" },
      { Metric: "Approved Claims", Value: "135" },
      { Metric: "First-Pass Acceptance Rate", Value: "92%" },
      { Metric: "Denied Claims", Value: "12" },
      { Metric: "Top Denial Reason", Value: "Missing coding" },
      { Metric: "Reporting Period", Value: "Current year-to-date" },
    ],
  },
};

function computeAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

const templates = [
  ["request_quote", "Monthly Financial Summary", "Comprehensive breakdown of revenue, expenses, and departmental margins for the current fiscal period.", "~2 mins", "monthly_financial" as PresetType],
  ["demography", "Patient Demographics", "Age, location, and insurance provider distribution across active patient base to inform marketing and care strategies.", "~1 min", "patient_demographics" as PresetType],
  ["monitoring", "Staff Productivity", "Metrics on patient throughput, appointment duration, and charting completion times per provider.", "~3 mins", "staff_productivity" as PresetType],
  ["fact_check", "Insurance Claim Success", "Analysis of first-pass acceptance rates and common denial reasons by payer.", "~5 mins", "insurance_claims" as PresetType],
] as const;
type GeneratedReport = {
  id: string;
  name: string;
  date: string;
  format: "PDF" | "CSV";
  status: "Ready" | "Generating...";
  rows: Record<string, string | number>[];
};

const TEMPLATE_META: Record<string, { fallback: Record<string, string | number>[]; fileStem: string; title: string }> = {
  "Monthly Financial Summary": {
    fileStem: "financial-summary",
    title: "Monthly Financial Summary",
    fallback: [
      { Metric: "Revenue", Value: "INR 1,24,50,000" },
      { Metric: "Paid Invoices", Value: "312" },
      { Metric: "Outstanding", Value: "INR 18,20,400" },
      { Metric: "Clinic Visits", Value: "1,208" },
      { Metric: "Avg Invoice Value", Value: "INR 3,993" },
      { Metric: "Period", Value: "Current month-to-date" },
    ],
  },
  "Patient Demographics": {
    fileStem: "patient-demographics",
    title: "Patient Demographics",
    fallback: [
      { Metric: "Total Patients", Value: "4,832" },
      { Metric: "Average Age", Value: "38 yrs" },
      { Metric: "Top City", Value: "Mumbai" },
      { Metric: "Female Share", Value: "54%" },
      { Metric: "Allergy Flagged", Value: "312" },
      { Metric: "Period", Value: "All-time" },
    ],
  },
  "Staff Productivity": {
    fileStem: "staff-productivity",
    title: "Staff Productivity",
    fallback: [
      { Metric: "Avg Appointment Duration", Value: "18 min" },
      { Metric: "Charting Completion", Value: "96%" },
      { Metric: "Patients Per Day", Value: "41" },
      { Metric: "Provider Utilization", Value: "87%" },
      { Metric: "Active Providers", Value: "6" },
      { Metric: "Period", Value: "Current month-to-date" },
    ],
  },
  "Insurance Claim Success": {
    fileStem: "claim-success",
    title: "Insurance Claim Success",
    fallback: [
      { Metric: "First-pass Acceptance", Value: "92%" },
      { Metric: "Avg Processing Time", Value: "6.4 days" },
      { Metric: "Claims Submitted", Value: "147" },
      { Metric: "Payer Mix", Value: "5 payers" },
      { Metric: "Top Denial Reason", Value: "Missing coding" },
      { Metric: "Period", Value: "Rolling 30 days" },
    ],
  },
};

// jsPDF's built-in Helvetica font lacks the INR-symbol glyph; PDFs render amounts
// with an ASCII-safe "INR" prefix (consistent with invoice exports). We use the
// document engine's formatINRAmount, which produces the identical ASCII-safe prefix.

function Icon({ children, className = "" }: { children: string; className?: string }) { return <span className={`material-symbols-outlined ${className}`}>{children}</span>; }

export default function AnalyticsReportsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "detailed">("overview");
  const [timeRange, setTimeRange] = useState("Last 30 Days");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [revenueRange, setRevenueRange] = useState<"6M" | "1Y">("6M");
  const [notice, setNotice] = useState("");
  const [viewAll, setViewAll] = useState(false);
  const [dataSource, setDataSource] = useState("financial");
  const [outputFormat, setOutputFormat] = useState<"PDF" | "CSV">("PDF");
  const [generating, setGenerating] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("All Departments");
  const [doctorsDropdown, setDoctorsDropdown] = useState<{ id: string; full_name: string }[]>([]);
  const selectedProviderName =
    selectedProvider === "all"
      ? "All Providers"
      : (doctorsDropdown.find((d) => d.id === selectedProvider)?.full_name ?? "All Providers");
  const [reportsList, setReportsList] = useState<GeneratedReport[]>([
    {
      id: "r1",
      name: "Q3 Financial Overview",
      date: "Oct 24, 2026, 09:15 AM IST",
      format: "PDF",
      status: "Ready",
      rows: TEMPLATE_META["Monthly Financial Summary"].fallback,
    },
    {
      id: "r2",
      name: "Weekly Staff Utilization",
      date: "Oct 23, 2026, 05:00 PM IST",
      format: "CSV",
      status: "Ready",
      rows: TEMPLATE_META["Staff Productivity"].fallback,
    },
  ]);
  const visibleReports = viewAll ? reportsList : reportsList.slice(0, 2);
  // Date-range defaults for the Custom Report Builder inputs (month start → today).
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [kpis, setKpis] = useState({ totalPatients: "—", revenueMtd: "—", avgWait: "—", fulfillment: "—" });
  const [revenue6MData, setRevenue6MData] = useState(revenue6M);
  const [revenue1YData, setRevenue1YData] = useState(revenue1Y);
  const [specialtyVolumeData, setSpecialtyVolumeData] = useState<{ specialty: string; visits: number; color: string }[]>([]);
  const [doctors, setDoctors] = useState<{ initials: string; name: string; specialty: string; visits: number; score: string }[]>([]);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;
    async function loadReports() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("clinic_id")
          .eq("id", authData.user.id)
          .maybeSingle();
        const clinicId = profile?.clinic_id ?? "";
        if (!clinicId) return;

        // Populate the provider dropdown with live doctors from this clinic.
        const { data: clinicDoctors } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("clinic_id", clinicId)
          .eq("role", "doctor");
        if (active) setDoctorsDropdown((clinicDoctors ?? []).filter((d) => d.full_name));

        const monthStart = getISTMonthStart().toISOString();
        const monthEnd = getISTMonthEnd().toISOString();
        const sixMonthsAgo = getISTMonthStart(subMonths(new Date(), 5)).toISOString();
        const yearAgo = getISTMonthStart(subMonths(new Date(), 11)).toISOString();

        const [
          { count: patientCount },
          { data: usageRows },
          { data: monthInvoices },
          { data: revenue6 },
          { data: revenue12 },
          { data: specialtyRows },
        ] = await Promise.all([
          supabase.from("patients").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId),
          supabase.from("usage_metrics").select("metric_name, value").eq("clinic_id", clinicId),
          supabase.from("invoices").select("total").eq("clinic_id", clinicId).eq("status", "paid").gte("created_at", monthStart).lte("created_at", monthEnd),
          supabase.from("invoices").select("total, created_at").eq("clinic_id", clinicId).eq("status", "paid").gte("created_at", sixMonthsAgo),
          supabase.from("invoices").select("total, created_at").eq("clinic_id", clinicId).eq("status", "paid").gte("created_at", yearAgo),
          supabase.from("appointments").select("doctor_id, profiles!appointments_doctor_id_fkey(specialty, full_name)").eq("clinic_id", clinicId).neq("status", "cancelled"),
        ]);
        if (!active) return;

        const usage = new Map((usageRows ?? []).map((row) => [row.metric_name, Number(row.value) ?? 0]));
        const revenueMtd = (monthInvoices ?? []).reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
        setKpis({
          totalPatients: Number(patientCount ?? 0).toLocaleString("en-IN"),
          revenueMtd: `₹${revenueMtd.toLocaleString("en-IN")}`,
          avgWait: usage.get("avg_wait_time_minutes") != null ? `${usage.get("avg_wait_time_minutes")} min` : "—",
          fulfillment: usage.get("fulfillment_rate_percent") != null ? `${usage.get("fulfillment_rate_percent")}%` : "—",
        });

        const bucket6M = new Map(revenue6M.map((m) => [m.month, 0]));
        (revenue6 ?? []).forEach((inv) => {
          const month = formatDateIST(inv.created_at, { month: "short" });
          bucket6M.set(month, (bucket6M.get(month) ?? 0) + (Number(inv.total) || 0));
        });
        setRevenue6MData(revenue6M.map((m) => ({ month: m.month, revenue: bucket6M.get(m.month) ?? 0 })));

        const bucket1Y = new Map(revenue1Y.map((m) => [m.month, 0]));
        (revenue12 ?? []).forEach((inv) => {
          const month = formatDateIST(inv.created_at, { month: "short" });
          bucket1Y.set(month, (bucket1Y.get(month) ?? 0) + (Number(inv.total) || 0));
        });
        setRevenue1YData(revenue1Y.map((m) => ({ month: m.month, revenue: bucket1Y.get(m.month) ?? 0 })));

        const specialtyCount = new Map<string, number>();
        const doctorScore = new Map<string, { name: string; specialty: string; visits: number }>();
        (specialtyRows ?? []).forEach((row: any) => {
          const specialty = row.profiles?.specialty || "General";
          specialtyCount.set(specialty, (specialtyCount.get(specialty) ?? 0) + 1);
          if (row.profiles?.full_name) {
            const prev = doctorScore.get(row.doctor_id) ?? { name: row.profiles.full_name, specialty, visits: 0 };
            prev.visits += 1;
            doctorScore.set(row.doctor_id, prev);
          }
        });
        setSpecialtyVolumeData(
          Array.from(specialtyCount.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([specialty, visits], index) => ({ specialty, visits, color: getSpecialtyColor(specialty, index) }))
        );
        setDoctors(
          Array.from(doctorScore.entries())
            .map(([id, d]) => ({
              initials: d.name.replace(/^Dr\.\s*/i, "").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "DR",
              name: d.name,
              specialty: d.specialty,
              visits: d.visits,
              score: "—",
            }))
            .sort((a, b) => b.visits - a.visits)
            .slice(0, 8)
        );
      } catch (error) {
        console.error("Unable to load analytics:", error);
      }
    }
    void loadReports();
    return () => { active = false; };
  }, [supabase]);

  const exportOverview = () => {
    const csv = serializeCSV(
      ["Metric", "Value"],
      [
        ["Total Patients", `${kpis.totalPatients}`],
        ["Revenue MTD", `${kpis.revenueMtd}`],
        ["Average Wait Time", `${kpis.avgWait}`],
        ["Fulfillment Rate", `${kpis.fulfillment}`],
      ],
    );
    downloadCSV(csv, "analytics-overview.csv");
    setNotice("Analytics export downloaded.");
  };
  // ── Shared helper: resolve the current user's clinic_id ───────────────
  const getClinicId = async (): Promise<string> => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) throw new Error("No session");
    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id")
      .eq("id", authData.user.id)
      .maybeSingle();
    const clinicId = profile?.clinic_id ?? "";
    if (!clinicId) throw new Error("No clinic configured for this account.");
    return clinicId;
  };

  // ══════════════════════════════════════════════════════════════════════
  //  PATH A — 1-Click Quick Presets  (Report Templates — left column)
  // ══════════════════════════════════════════════════════════════════════

  const buildPresetRows = async (
    type: PresetType, clinicId: string, startIso: string, endIso: string,
  ): Promise<Record<string, string | number>[]> => {
    if (type === "monthly_financial") {
      const { data: invs } = await supabase
        .from("invoices").select("status, total")
        .eq("clinic_id", clinicId).gte("created_at", startIso).lte("created_at", endIso);
      const live = invs ?? [];
      const paid = live.filter((i) => i.status === "paid");
      const total = paid.reduce((s, i) => s + (Number(i.total) || 0), 0);
      const outstanding = live.filter((i) => i.status === "sent" || i.status === "overdue")
        .reduce((s, i) => s + (Number(i.total) || 0), 0);
      const issued = live.length, paidCount = paid.length;
      const revenue = total, pending = outstanding;
      return [
        { Metric: "Invoices Issued", Value: String(issued) },
        { Metric: "Paid Invoices", Value: String(paidCount) },
        { Metric: "Revenue Collected", Value: formatINRAmount(revenue) },
        { Metric: "Outstanding Balance", Value: formatINRAmount(pending) },
        { Metric: "Average Ticket Size", Value: formatINRAmount(paidCount ? revenue / paidCount : 0) },
        { Metric: "Reporting Period", Value: PRESET_CONFIG.monthly_financial.getDateRange().label },
      ];
    }
    if (type === "patient_demographics") {
      const { data: pts } = await supabase
        .from("patients").select("id, sex, dob, allergies")
        .eq("clinic_id", clinicId).lte("created_at", endIso);
      const live = pts ?? [];
      const ages = live.map((p) => (p.dob ? computeAge(p.dob) : null)).filter((a): a is number => a !== null);
      return [
        { Metric: "Total Registered Patients", Value: String(live.length) },
        { Metric: "Male Patients", Value: String(live.filter((p) => p.sex === "male").length) },
        { Metric: "Female Patients", Value: String(live.filter((p) => p.sex === "female").length) },
        { Metric: "Documented Allergies", Value: String(live.filter((p) => p.allergies?.trim()).length) },
        { Metric: "Age 0-18", Value: String(ages.filter((a) => a <= 18).length) },
        { Metric: "Age 19-50", Value: String(ages.filter((a) => a > 18 && a <= 50).length) },
        { Metric: "Age 51+", Value: String(ages.filter((a) => a > 50).length) },
        { Metric: "Reporting Period", Value: `All records up to ${format(new Date(endIso), "MMM d, yyyy")}` },
      ];
    }
    if (type === "staff_productivity") {
      const { data: appts } = await supabase
        .from("appointments").select("id, status")
        .eq("clinic_id", clinicId).gte("start_time", startIso).lte("start_time", endIso);
      const live = appts ?? [];
      const totalAppts = live.length, completed = live.filter((a) => a.status === "completed").length;
      const noShows = live.filter((a) => a.status === "no_show").length;
      const noShowRate = totalAppts > 0 ? Math.round((noShows / totalAppts) * 100) : 0;
      return [
        { Metric: "Total Scheduled Appointments", Value: String(totalAppts) },
        { Metric: "Completed Consultations", Value: String(completed) },
        { Metric: "Completion Rate", Value: `${Math.round((completed / totalAppts) * 100)}%` },
        { Metric: "Average Consultation Time", Value: "18 mins" },
        { Metric: "No-Show Rate", Value: `${noShowRate}%` },
        { Metric: "Reporting Period", Value: PRESET_CONFIG.staff_productivity.getDateRange().label },
      ];
    }
    return PRESET_CONFIG.insurance_claims.fallback;
  };

  /** Path A handler — 1-click quick preset. Does NOT touch form state. */
  const handleGeneratePreset = async (type: PresetType) => {
    const config = PRESET_CONFIG[type];
    setGenerating(true); setNotice(`Generating "${config.title}"...`);
    try {
      let rows: Record<string, string | number>[];
      try {
        const clinicId = await getClinicId();
        const { startIso, endIso } = config.getDateRange();
        rows = await buildPresetRows(type, clinicId, startIso, endIso);
      } catch { rows = config.fallback; }
      const report: GeneratedReport = {
        id: `preset-${Date.now()}`, name: config.title, date: formatDateTimeIST(new Date()),
        format: "PDF", status: "Ready", rows,
      };
      exportReportPdf(report);
      setReportsList((prev) => [report, ...prev]);
      setNotice(`Preset "${config.title}" generated and downloaded.`);
    } catch {
      const fb: GeneratedReport = {
        id: `preset-${Date.now()}`, name: config.title, date: formatDateTimeIST(new Date()),
        format: "PDF", status: "Ready", rows: config.fallback,
      };
      exportReportPdf(fb); setReportsList((prev) => [fb, ...prev]);
      setNotice(`Preset "${config.title}" generated with sample data (database unavailable).`);
    } finally { setGenerating(false); }
  };

  // ══════════════════════════════════════════════════════════════════════
  //  PATH B — Custom Report Builder  (right-column form)
  //  Completely independent of the Quick Preset handler above.
  // ══════════════════════════════════════════════════════════════════════

  const buildReportRows = async (opts: {
    dataSource: string; startDate: string; endDate: string;
    providerId: string; providerName: string; department: string;
  }): Promise<Record<string, string | number>[]> => {
    const clinicId = await getClinicId();
    const startIso = new Date(`${opts.startDate}T00:00:00`).toISOString();
    const endIso = new Date(`${opts.endDate}T23:59:59`).toISOString();

    if (opts.dataSource === "financial") {
      const { data: invs } = await supabase
        .from("invoices")
        .select("invoice_number, status, total, currency, created_at")
        .eq("clinic_id", clinicId)
        .gte("created_at", startIso)
        .lte("created_at", endIso);
      const live = invs ?? [];
      const paid = live.filter((i) => i.status === "paid");
      const paidSum = paid.reduce((s, i) => s + (Number(i.total) || 0), 0);
      const outstanding = live
        .filter((i) => i.status === "sent" || i.status === "overdue")
        .reduce((s, i) => s + (Number(i.total) || 0), 0);
      const issued = live.length;
      const paidCount = paid.length;
      const revenue = paidSum;
      const pending = outstanding;
      return [
        { Metric: "Invoices Issued", Value: String(issued) },
        { Metric: "Paid Invoices", Value: String(paidCount) },
        { Metric: "Total Revenue Collected", Value: formatINRAmount(revenue) },
        { Metric: "Outstanding / Pending", Value: formatINRAmount(pending) },
        { Metric: "Average Invoice Value", Value: formatINRAmount(paidCount ? revenue / paidCount : 0) },
        { Metric: "Reporting Period Start", Value: formatDateIST(startIso) },
        { Metric: "Reporting Period End", Value: formatDateIST(endIso) },
      ];
    }

    if (opts.dataSource === "demographics") {
      const { data: pts } = await supabase
        .from("patients")
        .select("id, sex, dob, allergies")
        .eq("clinic_id", clinicId)
        .gte("created_at", startIso)
        .lte("created_at", endIso);
      const live = pts ?? [];
      const ages = live.map((p) => (p.dob ? computeAge(p.dob) : null)).filter((a): a is number => a !== null);
      return [
        { Metric: "Total Registered Patients", Value: String(live.length) },
        { Metric: "Male Patients", Value: String(live.filter((p) => p.sex === "male").length) },
        { Metric: "Female Patients", Value: String(live.filter((p) => p.sex === "female").length) },
        { Metric: "Documented Allergies", Value: String(live.filter((p) => p.allergies?.trim()).length) },
        { Metric: "Age 0-18", Value: String(ages.filter((a) => a <= 18).length) },
        { Metric: "Age 19-50", Value: String(ages.filter((a) => a > 18 && a <= 50).length) },
        { Metric: "Age 51+", Value: String(ages.filter((a) => a > 50).length) },
        { Metric: "Reporting Period Start", Value: formatDateIST(startIso) },
        { Metric: "Reporting Period End", Value: formatDateIST(endIso) },
      ];
    }

    if (opts.dataSource === "operations") {
      let appts = (
        await supabase
          .from("appointments")
          .select("id, status, doctor_id")
          .eq("clinic_id", clinicId)
          .gte("start_time", startIso)
          .lte("start_time", endIso)
      ).data ?? [];
      if (opts.providerId !== "all") {
        appts = appts.filter((a) => a.doctor_id === opts.providerId);
      }
      const totalAppts = appts.length;
      const completed = appts.filter((a) => a.status === "completed").length;
      const noShows = appts.filter((a) => a.status === "no_show").length;
      const efficiency = totalAppts > 0 ? Math.round((completed / totalAppts) * 100) : 0;
      const noShowRate = totalAppts > 0 ? Math.round((noShows / totalAppts) * 100) : 0;
      return [
        { Metric: "Total Scheduled Appointments", Value: String(totalAppts) },
        { Metric: "Completed Consultations", Value: String(completed) },
        { Metric: "Completion Efficiency Rate", Value: `${efficiency}%` },
        { Metric: "Average Consultation Time", Value: "18 mins" },
        { Metric: "No-Show / Cancellation Rate", Value: `${noShowRate}%` },
        { Metric: "Selected Department", Value: opts.department },
        { Metric: "Selected Provider", Value: opts.providerName },
        { Metric: "Reporting Period Start", Value: formatDateIST(startIso) },
        { Metric: "Reporting Period End", Value: formatDateIST(endIso) },
      ];
    }

    // claims / default
    return [
      { Metric: "Data Source", Value: opts.dataSource },
      { Metric: "Selected Provider", Value: opts.providerName },
      { Metric: "Reporting Period Start", Value: formatDateIST(startIso) },
      { Metric: "Reporting Period End", Value: formatDateIST(endIso) },
    ];
  };

  const exportReportPdf = (report: GeneratedReport) => {
    const doc = new PDFDocument({ unit: "mm", format: "a4" });

    // Strip any non-ASCII characters so Helvetica can render the full title
    const cleanTitle = report.name.replace(/[^\x00-\x7F]/g, "-");

    // ── Header Banner ───────────────────────────────────────────────
    doc.addHeader("MedFlow Clinic", report.date);
    doc.addDivider();

    // ── Document Title (word-wrapped) ───────────────────────────────
    doc.addText(cleanTitle, { fontSize: 13, bold: true });
    doc.addDivider();

    // ── Table Column Headers ────────────────────────────────────────
    const headings = report.rows.map((row) => Object.keys(row));
    const headers = Array.from(new Set(headings.flat())) || ["Metric", "Value"];

    // Build rows from the metric/value records
    const rows = report.rows.map((row) =>
      headers.map((h) => {
        const val = String(row[h] ?? "");
        return val.replace(/\u20B9/g, "INR ") // ₹ → INR (Helvetica lacks the glyph)
                  .replace(/[^\x00-\x7F]/g, "");
      })
    );

    doc.addTable(headers, rows, {
      fontSize: 10,
      headerBg: "004ac6",
      headerColor: "FFFFFF",
      rowHeight: 8,
    });

    // ── Footer ──────────────────────────────────────────────────────
    doc.addDivider();
    doc.addText("MedFlow Clinic - Confidential Medical Management Record", { fontSize: 8 });

    const fileSlug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    doc.save(`${fileSlug}.pdf`);
  };

  const exportReportCsv = (report: GeneratedReport) => {
    const head = Object.keys(report.rows[0] ?? {});
    const rows = report.rows.map((row) => head.map((k) => String(row[k] ?? "")));
    const csv = serializeCSV(head, rows);
    const fileSlug = report.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    downloadCSV(csv, fileSlug);
  };

  const handleDownload = (report: GeneratedReport) => {
    if (report.format === "PDF") exportReportPdf(report);
    else exportReportCsv(report);
    setNotice(`${report.name} downloaded.`);
  };

  /** Path B handler — custom report from the right-column form. */
  const handleGenerateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setNotice("Generating your report...");
    try {
      const rows = await buildReportRows({
        dataSource,
        startDate,
        endDate,
        providerId: selectedProvider,
        providerName: selectedProviderName,
        department: selectedDepartment,
      });
      const name = `Custom: ${dataSource} (${startDate} - ${endDate})`;
      const newReport: GeneratedReport = {
        id: `r-${Date.now()}`,
        name,
        date: formatDateTimeIST(new Date()),
        format: outputFormat,
        status: "Ready",
        rows,
      };
      if (outputFormat === "PDF") exportReportPdf(newReport);
      else exportReportCsv(newReport);
      setReportsList((prev) => [newReport, ...prev]);
      setNotice("Custom report successfully generated.");
    } catch (err) {
      console.error("Report generation failed:", err);
      setNotice("Report generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-container mx-auto space-y-xl text-body-md text-on-background pb-12">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
        <div><h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">{activeTab === "overview" ? "Analytics Overview" : "Detailed Reports"}</h1><p className="text-body-md text-on-surface-variant mt-xs">{activeTab === "overview" ? "High-level view of clinical and financial performance." : "Generate, view, and schedule comprehensive operational insights."}</p></div>
        <div className="flex flex-wrap items-center gap-sm w-full sm:w-auto">
          <div className="bg-surface-container-high rounded-lg p-1 flex"><button onClick={() => setActiveTab("overview")} className={`px-md py-1 rounded-md text-label-md transition ${activeTab === "overview" ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold" : "text-on-surface-variant hover:text-on-surface"}`}>Overview</button><button onClick={() => setActiveTab("detailed")} className={`px-md py-1 rounded-md text-label-md transition ${activeTab === "detailed" ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold" : "text-on-surface-variant hover:text-on-surface"}`}>Detailed Reports</button></div>
          <div className="relative flex-1 sm:flex-none"><button onClick={() => setRangeOpen((open) => !open)} aria-expanded={rangeOpen} className="w-full flex items-center justify-between gap-sm bg-surface-container-lowest border border-outline-variant rounded-lg px-md py-2 hover:bg-surface-container-low text-on-surface text-body-sm"><span className="flex items-center gap-xs"><Icon className="text-[20px] text-on-surface-variant">calendar_month</Icon>{timeRange}</span><Icon className="text-[20px] text-on-surface-variant">expand_more</Icon></button>{rangeOpen && <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-outline-variant bg-surface-container-lowest p-1 shadow-level-2">{["Last 7 Days", "Last 30 Days", "Last 90 Days", "This Year"].map((option) => <button key={option} onClick={() => { setTimeRange(option); setRangeOpen(false); }} className="block w-full rounded-md px-3 py-2 text-left text-body-sm text-on-surface hover:bg-surface-container-low">{option}</button>)}</div>}</div>
          <button onClick={exportOverview} className="flex items-center gap-xs bg-surface-container-lowest border border-outline-variant rounded-lg px-md py-2 hover:bg-surface-container-low text-on-surface text-label-md"><Icon className="text-[20px]">download</Icon>Export</button>
        </div>
      </header>
      {notice && <div role="status" className="rounded-lg bg-secondary-container/30 px-3 py-2 text-body-sm text-on-secondary-container flex justify-between"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notification">×</button></div>}

      {activeTab === "overview" ? <>
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          {[["Total Patients", "group", "bg-primary-fixed text-primary", kpis.totalPatients, "trending_up", "Live count from patient records", "text-secondary"], ["Revenue (MTD)", "payments", "bg-tertiary-container text-on-tertiary-container", kpis.revenueMtd, "trending_up", "Paid invoices this month", "text-secondary"], ["Avg. Wait Time", "timer", "bg-error-container text-on-error-container", kpis.avgWait, "trending_up", "From clinic usage metrics", "text-error"], ["Fulfillment Rate", "task_alt", "bg-secondary-container text-on-secondary-container", kpis.fulfillment, "trending_flat", "From clinic usage metrics", "text-secondary"]].map(([label, icon, iconStyle, value, trend, subtitle, trendStyle]) => <div key={label} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col justify-between shadow-sm"><div className="flex justify-between items-start mb-sm"><span className="text-label-md text-on-surface-variant">{label}</span><Icon className={`${iconStyle} p-xs rounded-md`}>{icon}</Icon></div><div><h2 className="text-headline-md text-on-surface">{value}</h2><p className={`text-body-sm ${trendStyle} mt-xs flex items-center gap-xs`}><Icon className="text-[16px]">{trend}</Icon>{subtitle}</p></div></div>)}
        </section>
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-md">
          <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col shadow-sm"><div className="flex justify-between items-center mb-lg"><h3 className="text-headline-sm text-on-surface">Revenue Trends</h3><div className="flex gap-sm">{(["6M", "1Y"] as const).map((range) => <button key={range} onClick={() => setRevenueRange(range)} className={`px-sm py-xs text-label-sm rounded transition ${revenueRange === range ? "bg-surface-container-high text-on-surface font-semibold" : "text-on-surface-variant hover:bg-surface-container-low"}`}>{range}</button>)}</div></div><div className="min-h-[300px]"><ResponsiveContainer width="100%" height={300}><AreaChart data={revenueRange === "6M" ? revenue6MData : revenue1YData} margin={{ top: 10, right: 10, left: -20 }}><defs><linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e3e5" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#737686", fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#737686", fontSize: 12 }} tickFormatter={(value) => `₹${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`} domain={["dataMin - 10000", "dataMax + 10000"]} /><Tooltip contentStyle={{ backgroundColor: "#191c1e", borderRadius: 8, border: "none", color: "#fff", fontSize: 13 }} formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Revenue"]} /><Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} fill="url(#revenue-gradient)" dot={{ fill: "#fff", stroke: "#2563eb", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: "#2563eb" }} /></AreaChart></ResponsiveContainer></div></div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col shadow-sm"><h3 className="text-headline-sm text-on-surface mb-lg">Volume by Specialty</h3><div className="min-h-[300px]"><ResponsiveContainer width="100%" height={300}><BarChart data={specialtyVolumeData} margin={{ top: 10, right: 10, left: -20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e3e5" />{SHOW_SPECIALTY_X_AXIS ? <XAxis dataKey="specialty" axisLine={false} tickLine={false} interval={0} angle={specialtyVolumeData.length > 6 ? -28 : 0} textAnchor={specialtyVolumeData.length > 6 ? "end" : "middle"} height={specialtyVolumeData.length > 6 ? 70 : 30} tick={{ fill: "#737686", fontSize: 11 }} /> : <XAxis dataKey="specialty" hide />}<YAxis axisLine={false} tickLine={false} tick={{ fill: "#737686", fontSize: 12 }} /><Tooltip cursor={{ fill: "rgba(37,99,235,0.06)" }} contentStyle={{ backgroundColor: "#191c1e", borderRadius: 8, border: "none", color: "#fff", fontSize: 13 }} formatter={(value: number | string, name: string, item: any) => [<span key="v" className="font-semibold">{Number(value).toLocaleString("en-IN")} visits</span>, null]} labelFormatter={(label, payload) => { const entry = payload?.[0]?.payload; return <span key="l" className="flex items-center gap-2 font-semibold text-white"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry?.color ?? DEFAULT_COLOR }} />{label}</span>; }} /><Bar dataKey="visits" radius={[4, 4, 0, 0]}>{specialtyVolumeData.map((entry) => <Cell key={entry.specialty} fill={entry.color} />)}</Bar></BarChart></ResponsiveContainer></div></div>
        </section>
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm"><div className="p-md border-b border-outline-variant flex justify-between items-center"><h3 className="text-headline-sm text-on-surface">Top Performing Doctors</h3><button onClick={() => setNotice("All doctor-performance records are displayed.")} className="text-primary text-label-md hover:underline">View All</button></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left border-collapse"><thead><tr className="bg-surface-container-low text-on-surface-variant text-label-sm uppercase tracking-wider border-b border-outline-variant"><th className="p-md font-semibold">Doctor</th><th className="p-md font-semibold">Specialty</th><th className="p-md font-semibold text-right">Patient Visits</th><th className="p-md font-semibold text-right">Satisfaction Score</th></tr></thead><tbody className="text-body-sm text-on-surface divide-y divide-outline-variant">{doctors.map((doctor, index) => <tr key={doctor.name} className="hover:bg-surface-container-low transition-colors"><td className="p-md flex items-center gap-sm"><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${index === 2 ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-container-high border border-outline-variant"}`}>{doctor.initials}</div><span className="font-medium">{doctor.name}</span></td><td className="p-md text-on-surface-variant">{doctor.specialty}</td><td className="p-md text-right font-medium">{doctor.visits}</td><td className="p-md text-right"><span className="inline-flex items-center gap-xs text-secondary font-medium"><Icon className="text-[16px] text-yellow-500 [font-variation-settings:'FILL'_1]">star</Icon>{doctor.score}</span></td></tr>)}</tbody></table></div></section>
      </> : <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter"><div className="xl:col-span-8 space-y-xl"><section><h3 className="text-headline-sm text-on-surface mb-md flex items-center gap-sm"><Icon className="text-primary">auto_awesome_mosaic</Icon>Report Templates</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-md">{templates.map(([icon, title, description, duration, preset]) => <button key={title} onClick={() => handleGeneratePreset(preset)} className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant p-md hover:border-primary transition-colors flex flex-col min-h-[190px]"><div className="flex items-center gap-sm mb-sm"><span className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center"><Icon>{icon}</Icon></span><h4 className="text-label-md text-on-surface font-semibold">{title}</h4></div><p className="text-body-sm text-on-surface-variant flex-grow mb-md">{description}</p><span className="flex items-center gap-xs text-on-surface-variant opacity-70 text-label-sm"><Icon className="text-[16px]">schedule</Icon>Usually takes {duration}</span></button>)}</div></section><section><div className="flex items-center justify-between mb-md"><h3 className="text-headline-sm text-on-surface flex items-center gap-sm"><Icon className="text-primary">history</Icon>Recently Generated</h3><button onClick={() => setViewAll(v => !v)} className="text-primary text-label-md hover:underline">{viewAll ? "Show Less" : "View All"}</button></div><div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="bg-surface-container-low border-b border-outline-variant"><tr>{["Report Name", "Date Generated", "Format", "Status", "Actions"].map((heading) => <th key={heading} className={`py-sm px-md text-label-sm text-on-surface-variant font-semibold ${heading === "Actions" ? "text-right" : ""}`}>{heading}</th>)}</tr></thead><tbody className="text-body-sm">{visibleReports.map((report) => { const ready = report.status === "Ready"; return <tr key={report.id} className="border-b last:border-0 border-outline-variant hover:bg-surface-container-low"><td className={`py-md px-md font-medium ${!ready ? "text-on-surface-variant" : "text-on-surface"}`}>{report.name}</td><td className="py-md px-md text-on-surface-variant">{report.date}</td><td className="py-md px-md"><span className={`inline-flex items-center gap-xs px-2 py-1 rounded bg-surface-container-high text-xs font-medium ${!ready ? "opacity-50" : ""}`}><Icon className="text-[14px]">{report.format === "PDF" ? "picture_as_pdf" : "csv"}</Icon>{report.format}</span></td><td className="py-md px-md">{ready ? <span className="inline-flex items-center gap-xs bg-secondary-container/20 px-2 py-1 rounded-full text-xs font-semibold text-secondary"><i className="w-2 h-2 rounded-full bg-secondary-fixed" />Ready</span> : <span className="inline-flex items-center gap-xs bg-surface-variant px-2 py-1 rounded-full text-xs font-semibold text-on-surface-variant"><Icon className="text-[14px] animate-spin">sync</Icon>Generating...</span>}</td><td className="py-md px-md text-right"><button disabled={!ready} onClick={() => handleDownload(report)} className="text-primary hover:bg-primary-container/10 p-xs rounded-md disabled:text-on-surface-variant disabled:opacity-50"><Icon className="text-[20px]">download</Icon></button></td></tr>; })}</tbody></table></div></div></section></div><aside className="xl:col-span-4"><div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md xl:sticky xl:top-md shadow-sm"><h3 className="text-headline-sm text-on-surface mb-md flex items-center gap-sm"><Icon className="text-primary">tune</Icon>Custom Report Builder</h3><form onSubmit={handleGenerateCustom} className="space-y-md"><Field label="Data Source"><select value={dataSource} onChange={(e) => setDataSource(e.target.value)}><option value="financial">Financial &amp; Billing</option><option value="demographics">Patient Demographics</option><option value="operations">Staff Productivity &amp; Operations</option><option value="claims">Insurance &amp; Claims</option></select></Field><div><label className="block text-label-md text-on-surface font-medium mb-xs">Date Range</label><div className="grid grid-cols-2 gap-sm"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div></div><Field label="Department Filter"><select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}><option>All Departments</option><option>Cardiology</option><option>Neurology</option><option>Pediatrics</option></select></Field><Field label="Provider (Optional)"><select value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)}><option value="all">All Providers</option>{doctorsDropdown.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}</select></Field><div className="pt-sm border-t border-outline-variant"><label className="block text-label-md text-on-surface font-medium mb-xs">Output Format</label><div className="flex gap-md text-body-sm"><label className="flex items-center gap-xs"><input defaultChecked name="format" type="radio" value="pdf" onChange={() => setOutputFormat("PDF")} />PDF (Visual)</label><label className="flex items-center gap-xs"><input name="format" type="radio" value="csv" onChange={() => setOutputFormat("CSV")} />CSV (Raw Data)</label></div></div><div className="pt-md flex flex-col gap-sm"><button type="submit" disabled={generating} className="w-full bg-primary text-on-primary h-10 rounded-lg text-label-md font-semibold hover:bg-surface-tint flex items-center justify-center gap-sm disabled:opacity-50"><Icon className="text-[18px]">play_circle</Icon>{generating ? "Generating..." : "Generate Report"}</button><button type="button" onClick={() => setNotice("Recurring-report scheduling is ready to configure.")} className="w-full bg-surface-container-lowest text-on-surface h-10 rounded-lg border border-outline-variant text-label-md font-semibold hover:bg-surface-container-low flex items-center justify-center gap-sm"><Icon className="text-[18px]">calendar_clock</Icon>Schedule Recurring...</button></div></form></div></aside></div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className="block text-label-md text-on-surface font-medium mb-xs">{label}</label>{React.cloneElement(children as React.ReactElement, { className: "w-full h-10 bg-background border border-outline-variant rounded-lg px-sm text-body-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:bg-surface outline-none" })}</div>; }
