"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { formatDateIST, formatDateTimeIST } from "@/lib/date";
import { jsPDF } from "jspdf";
import { createClient } from "@/lib/supabase/client";

const revenue6M = Array.from({ length: 6 }, (_, i) => {
  const d = subMonths(new Date(), 5 - i);
  return { month: format(d, "MMM"), revenue: 0 };
});
const revenue1Y = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), 11 - i);
  return { month: format(d, "MMM"), revenue: 0 };
});
const SPECIALTY_COLORS: Record<string, string> = {
  Cardiology: "#2563eb",
  Pediatrics: "#006c49",
  "General Medicine": "#005e6e",
  Neurology: "#b4c5ff",
  Orthopedics: "#6cf8bb",
};
const DEFAULT_COLOR = "#2563eb";
const templates = [
  ["request_quote", "Monthly Financial Summary", "Comprehensive breakdown of revenue, expenses, and departmental margins for the current fiscal period.", "~2 mins"],
  ["demography", "Patient Demographics", "Age, location, and insurance provider distribution across active patient base to inform marketing and care strategies.", "~1 min"],
  ["monitoring", "Staff Productivity", "Metrics on patient throughput, appointment duration, and charting completion times per provider.", "~3 mins"],
  ["fact_check", "Insurance Claim Success", "Analysis of first-pass acceptance rates and common denial reasons by payer.", "~5 mins"],
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
// with an ASCII-safe "INR" prefix (consistent with invoice exports).
function reportUsd(amount: number): string {
  return `INR ${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function csvEscape(value: string | number): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function download(filename: string, content: string, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}
function Icon({ children, className = "" }: { children: string; className?: string }) { return <span className={`material-symbols-outlined ${className}`}>{children}</span>; }

export default function AnalyticsReportsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "detailed">("overview");
  const [timeRange, setTimeRange] = useState("Last 30 Days");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [revenueRange, setRevenueRange] = useState<"6M" | "1Y">("6M");
  const [notice, setNotice] = useState("");
  const [viewAll, setViewAll] = useState(false);
  const [dataSource, setDataSource] = useState("Financial & Billing");
  const [outputFormat, setOutputFormat] = useState<"PDF" | "CSV">("PDF");
  const [generating, setGenerating] = useState(false);
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

        const monthStart = startOfMonth(new Date()).toISOString();
        const monthEnd = endOfMonth(new Date()).toISOString();
        const sixMonthsAgo = subMonths(new Date(), 6).toISOString();
        const yearAgo = subMonths(new Date(), 12).toISOString();

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
            .map(([specialty, visits]) => ({ specialty, visits, color: SPECIALTY_COLORS[specialty] ?? DEFAULT_COLOR }))
            .sort((a, b) => b.visits - a.visits)
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
    download("analytics-overview.csv", `Metric,Value\nTotal Patients,${kpis.totalPatients}\nRevenue MTD,${kpis.revenueMtd}\nAverage Wait Time,${kpis.avgWait}\nFulfillment Rate,${kpis.fulfillment}`, "text/csv;charset=utf-8");
    setNotice("Analytics export downloaded.");
  };
  const handleTemplateSelect = (title: string, icon: string) => {
    setDataSource(
      title === "Patient Demographics" ? "Clinical Outcomes"
        : title === "Staff Productivity" ? "Operational Efficiency"
          : title === "Insurance Claim Success" ? "Patient Feedback"
            : "Financial & Billing"
    );
    setNotice(`Report template "${title}" selected. Choose a date range and click Generate Report.`);
  };

  const buildReportRows = async (): Promise<Record<string, string | number>[]> => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) throw new Error("No session");
      const { data: profile } = await supabase
        .from("profiles")
        .select("clinic_id")
        .eq("id", authData.user.id)
        .maybeSingle();
      const clinicId = profile?.clinic_id ?? "";
      if (!clinicId) throw new Error("No clinic");

      const startIso = new Date(`${startDate}T00:00:00`).toISOString();
      const endIso = new Date(`${endDate}T23:59:59`).toISOString();

      if (dataSource === "Financial & Billing") {
        const { data: invs } = await supabase
          .from("invoices")
          .select("invoice_number, status, total, currency, created_at")
          .eq("clinic_id", clinicId)
          .gte("created_at", startIso)
          .lte("created_at", endIso);
        const paid = (invs ?? []).filter((i) => i.status === "paid");
        const total = paid.reduce((s, i) => s + (Number(i.total) || 0), 0);
        const outstanding = (invs ?? []).filter((i) => i.status === "sent" || i.status === "overdue")
          .reduce((s, i) => s + (Number(i.total) || 0), 0);
        return [
          { Metric: "Invoices Issued", Value: (invs ?? []).length },
          { Metric: "Paid Invoices", Value: paid.length },
          { Metric: "Revenue Collected", Value: reportUsd(total) },
          { Metric: "Outstanding", Value: reportUsd(outstanding) },
          { Metric: "Period Start", Value: formatDateIST(startIso) },
          { Metric: "Period End", Value: formatDateIST(endIso) },
        ];
      }

      if (dataSource === "Clinical Outcomes") {
        const { count } = await supabase
          .from("patients")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", clinicId)
          .gte("created_at", startIso)
          .lte("created_at", endIso);
        return [
          { Metric: "New Patients", Value: Number(count ?? 0) },
          { Metric: "Total Patients", Value: "—" },
          { Metric: "Period Start", Value: formatDateIST(startIso) },
          { Metric: "Period End", Value: formatDateIST(endIso) },
        ];
      }

      if (dataSource === "Operational Efficiency") {
        const { data: appts } = await supabase
          .from("appointments")
          .select("id")
          .eq("clinic_id", clinicId)
          .gte("start_time", startIso)
          .lte("start_time", endIso);
        return [
          { Metric: "Appointments", Value: (appts ?? []).length },
          { Metric: "Period Start", Value: formatDateIST(startIso) },
          { Metric: "Period End", Value: formatDateIST(endIso) },
        ];
      }

      // Patient Feedback / default
      return [
        { Metric: "Data Source", Value: dataSource },
        { Metric: "Period Start", Value: formatDateIST(startIso) },
        { Metric: "Period End", Value: formatDateIST(endIso) },
      ];
    } catch {
      // Fall back to canned sample data when live data is unavailable.
      const meta = Object.values(TEMPLATE_META).find((m) => {
        if (dataSource === "Financial & Billing") return m.title === "Monthly Financial Summary";
        if (dataSource === "Clinical Outcomes") return m.title === "Patient Demographics";
        if (dataSource === "Operational Efficiency") return m.title === "Staff Productivity";
        return m.title === "Insurance Claim Success";
      });
      return (meta?.fallback ?? TEMPLATE_META["Monthly Financial Summary"].fallback);
    }
  };

  const exportReportPdf = (report: GeneratedReport) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    // Strip any non-ASCII characters so Helvetica can render the full title
    const cleanTitle = report.name.replace(/[^\x00-\x7F]/g, "-");

    // ── Header Banner ───────────────────────────────────────────────
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 38, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(0, 74, 198);
    doc.text("MedFlow Clinic", 16, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Operational Intelligence & Clinical Reports", 16, 22);
    doc.text(`Generated on: ${report.date}`, 16, 27);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(16, 38, 194, 38);

    // ── Document Title (word-wrapped) ───────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    const splitTitle = doc.splitTextToSize(cleanTitle, 178);
    doc.text(splitTitle, 16, 48);

    let y = 48 + splitTitle.length * 6 + 4;

    // ── Table Column Headers (printed ONCE) ─────────────────────────
    doc.setFillColor(241, 245, 249);
    doc.rect(16, y - 5, 178, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("METRIC / FIELD", 20, y);
    doc.text("VALUE", 190, y, { align: "right" });

    y += 7;

    // ── Table Data Rows ─────────────────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);

    report.rows.forEach((row, index) => {
      // Zebra-stripe alternating rows
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(16, y - 4.5, 178, 7.5, "F");
      }

      const entries = Object.entries(row);
      const label = String(entries[0]?.[0] ?? "").replace(/[^\x00-\x7F]/g, "");
      const val = String(entries[0]?.[1] ?? "N/A")
        .replace(/\u20B9/g, "INR ")   // ₹ → INR  (Helvetica lacks the glyph)
        .replace(/[^\x00-\x7F]/g, "");

      doc.text(label, 20, y);
      doc.text(val, 190, y, { align: "right" });

      y += 7.5;

      // Page-break handling
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
    });

    // ── Footer ──────────────────────────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.line(16, 280, 194, 280);
    doc.text("MedFlow Clinic - Confidential Medical Management Record", 16, 285);

    const fileSlug = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    doc.save(`${fileSlug}.pdf`);
  };

  const exportReportCsv = (report: GeneratedReport) => {
    const head = Object.keys(report.rows[0] ?? {});
    const body = report.rows.map((row) => head.map((k) => csvEscape(row[k] ?? "")).join(",")).join("\n");
    download(`${report.name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.csv`, `${head.join(",")}\n${body}`, "text/csv;charset=utf-8");
  };

  const handleDownload = (report: GeneratedReport) => {
    if (report.format === "PDF") exportReportPdf(report);
    else exportReportCsv(report);
    setNotice(`${report.name} downloaded.`);
  };

  const generateReport = async () => {
    setGenerating(true);
    setNotice("Generating your report...");
    try {
      const rows = await buildReportRows();
      const name = `Custom: ${dataSource} (${startDate} - ${endDate})`;
      const newReport: GeneratedReport = {
        id: `r-${Date.now()}`,
        name,
        date: formatDateTimeIST(new Date()),
        format: outputFormat,
        status: "Ready",
        rows,
      };
      setReportsList((prev) => [newReport, ...prev]);
      setNotice(`${name} is ready to download.`);
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
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col shadow-sm"><h3 className="text-headline-sm text-on-surface mb-lg">Volume by Specialty</h3><div className="min-h-[300px]"><ResponsiveContainer width="100%" height={300}><BarChart data={specialtyVolumeData} margin={{ top: 10, right: 10, left: -20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e3e5" /><XAxis dataKey="specialty" axisLine={false} tickLine={false} tick={{ fill: "#737686", fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#737686", fontSize: 12 }} /><Tooltip contentStyle={{ backgroundColor: "#191c1e", borderRadius: 8, border: "none", color: "#fff", fontSize: 13 }} /><Bar dataKey="visits" radius={[4, 4, 0, 0]}>{specialtyVolumeData.map((entry) => <Cell key={entry.specialty} fill={entry.color} />)}</Bar></BarChart></ResponsiveContainer></div></div>
        </section>
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm"><div className="p-md border-b border-outline-variant flex justify-between items-center"><h3 className="text-headline-sm text-on-surface">Top Performing Doctors</h3><button onClick={() => setNotice("All doctor-performance records are displayed.")} className="text-primary text-label-md hover:underline">View All</button></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left border-collapse"><thead><tr className="bg-surface-container-low text-on-surface-variant text-label-sm uppercase tracking-wider border-b border-outline-variant"><th className="p-md font-semibold">Doctor</th><th className="p-md font-semibold">Specialty</th><th className="p-md font-semibold text-right">Patient Visits</th><th className="p-md font-semibold text-right">Satisfaction Score</th></tr></thead><tbody className="text-body-sm text-on-surface divide-y divide-outline-variant">{doctors.map((doctor, index) => <tr key={doctor.name} className="hover:bg-surface-container-low transition-colors"><td className="p-md flex items-center gap-sm"><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${index === 2 ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-container-high border border-outline-variant"}`}>{doctor.initials}</div><span className="font-medium">{doctor.name}</span></td><td className="p-md text-on-surface-variant">{doctor.specialty}</td><td className="p-md text-right font-medium">{doctor.visits}</td><td className="p-md text-right"><span className="inline-flex items-center gap-xs text-secondary font-medium"><Icon className="text-[16px] text-yellow-500 [font-variation-settings:'FILL'_1]">star</Icon>{doctor.score}</span></td></tr>)}</tbody></table></div></section>
      </> : <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter"><div className="xl:col-span-8 space-y-xl"><section><h3 className="text-headline-sm text-on-surface mb-md flex items-center gap-sm"><Icon className="text-primary">auto_awesome_mosaic</Icon>Report Templates</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-md">{templates.map(([icon, title, description, duration]) => <button key={title} onClick={() => handleTemplateSelect(title, icon)} className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant p-md hover:border-primary transition-colors flex flex-col min-h-[190px]"><div className="flex items-center gap-sm mb-sm"><span className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center"><Icon>{icon}</Icon></span><h4 className="text-label-md text-on-surface font-semibold">{title}</h4></div><p className="text-body-sm text-on-surface-variant flex-grow mb-md">{description}</p><span className="flex items-center gap-xs text-on-surface-variant opacity-70 text-label-sm"><Icon className="text-[16px]">schedule</Icon>Usually takes {duration}</span></button>)}</div></section><section><div className="flex items-center justify-between mb-md"><h3 className="text-headline-sm text-on-surface flex items-center gap-sm"><Icon className="text-primary">history</Icon>Recently Generated</h3><button onClick={() => setViewAll(v => !v)} className="text-primary text-label-md hover:underline">{viewAll ? "Show Less" : "View All"}</button></div><div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="bg-surface-container-low border-b border-outline-variant"><tr>{["Report Name", "Date Generated", "Format", "Status", "Actions"].map((heading) => <th key={heading} className={`py-sm px-md text-label-sm text-on-surface-variant font-semibold ${heading === "Actions" ? "text-right" : ""}`}>{heading}</th>)}</tr></thead><tbody className="text-body-sm">{visibleReports.map((report) => { const ready = report.status === "Ready"; return <tr key={report.id} className="border-b last:border-0 border-outline-variant hover:bg-surface-container-low"><td className={`py-md px-md font-medium ${!ready ? "text-on-surface-variant" : "text-on-surface"}`}>{report.name}</td><td className="py-md px-md text-on-surface-variant">{report.date}</td><td className="py-md px-md"><span className={`inline-flex items-center gap-xs px-2 py-1 rounded bg-surface-container-high text-xs font-medium ${!ready ? "opacity-50" : ""}`}><Icon className="text-[14px]">{report.format === "PDF" ? "picture_as_pdf" : "csv"}</Icon>{report.format}</span></td><td className="py-md px-md">{ready ? <span className="inline-flex items-center gap-xs bg-secondary-container/20 px-2 py-1 rounded-full text-xs font-semibold text-secondary"><i className="w-2 h-2 rounded-full bg-secondary-fixed" />Ready</span> : <span className="inline-flex items-center gap-xs bg-surface-variant px-2 py-1 rounded-full text-xs font-semibold text-on-surface-variant"><Icon className="text-[14px] animate-spin">sync</Icon>Generating...</span>}</td><td className="py-md px-md text-right"><button disabled={!ready} onClick={() => handleDownload(report)} className="text-primary hover:bg-primary-container/10 p-xs rounded-md disabled:text-on-surface-variant disabled:opacity-50"><Icon className="text-[20px]">download</Icon></button></td></tr>; })}</tbody></table></div></div></section></div><aside className="xl:col-span-4"><div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md xl:sticky xl:top-md shadow-sm"><h3 className="text-headline-sm text-on-surface mb-md flex items-center gap-sm"><Icon className="text-primary">tune</Icon>Custom Report Builder</h3><form onSubmit={(event) => { event.preventDefault(); generateReport(); }} className="space-y-md"><Field label="Data Source"><select value={dataSource} onChange={(e) => setDataSource(e.target.value)}><option>Financial &amp; Billing</option><option>Clinical Outcomes</option><option>Operational Efficiency</option><option>Patient Feedback</option></select></Field><div><label className="block text-label-md text-on-surface font-medium mb-xs">Date Range</label><div className="grid grid-cols-2 gap-sm"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div></div><Field label="Department Filter"><select><option>All Departments</option><option>Cardiology</option><option>Neurology</option><option>Pediatrics</option></select></Field><Field label="Provider (Optional)"><select><option>Any Provider</option><option>Dr. Alan Smith</option><option>Dr. Sarah Jenkins</option><option>Dr. Emily Chen</option></select></Field><div className="pt-sm border-t border-outline-variant"><label className="block text-label-md text-on-surface font-medium mb-xs">Output Format</label><div className="flex gap-md text-body-sm"><label className="flex items-center gap-xs"><input defaultChecked name="format" type="radio" value="pdf" onChange={() => setOutputFormat("PDF")} />PDF (Visual)</label><label className="flex items-center gap-xs"><input name="format" type="radio" value="csv" onChange={() => setOutputFormat("CSV")} />CSV (Raw Data)</label></div></div><div className="pt-md flex flex-col gap-sm"><button type="submit" disabled={generating} className="w-full bg-primary text-on-primary h-10 rounded-lg text-label-md font-semibold hover:bg-surface-tint flex items-center justify-center gap-sm disabled:opacity-50"><Icon className="text-[18px]">play_circle</Icon>{generating ? "Generating..." : "Generate Report"}</button><button type="button" onClick={() => setNotice("Recurring-report scheduling is ready to configure.")} className="w-full bg-surface-container-lowest text-on-surface h-10 rounded-lg border border-outline-variant text-label-md font-semibold hover:bg-surface-container-low flex items-center justify-center gap-sm"><Icon className="text-[18px]">calendar_clock</Icon>Schedule Recurring...</button></div></form></div></aside></div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className="block text-label-md text-on-surface font-medium mb-xs">{label}</label>{React.cloneElement(children as React.ReactElement, { className: "w-full h-10 bg-background border border-outline-variant rounded-lg px-sm text-body-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:bg-surface outline-none" })}</div>; }
