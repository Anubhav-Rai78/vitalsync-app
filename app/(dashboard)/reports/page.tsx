"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
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
const reports = [
  ["Q3 Financial Overview", "Oct 24, 2023, 09:15 AM", "PDF", "Ready"],
  ["Weekly Staff Utilization", "Oct 23, 2023, 17:00 PM", "CSV", "Ready"],
  ["Custom: Denials YTD", "Oct 25, 2023, 10:30 AM", "PDF", "Generating..."],
] as const;

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
          const month = format(new Date(inv.created_at), "MMM");
          bucket6M.set(month, (bucket6M.get(month) ?? 0) + (Number(inv.total) || 0));
        });
        setRevenue6MData(revenue6M.map((m) => ({ month: m.month, revenue: bucket6M.get(m.month) ?? 0 })));

        const bucket1Y = new Map(revenue1Y.map((m) => [m.month, 0]));
        (revenue12 ?? []).forEach((inv) => {
          const month = format(new Date(inv.created_at), "MMM");
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
  const generateReport = () => setNotice("Your custom report is being generated.");

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
      </> : <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter"><div className="xl:col-span-8 space-y-xl"><section><h3 className="text-headline-sm text-on-surface mb-md flex items-center gap-sm"><Icon className="text-primary">auto_awesome_mosaic</Icon>Report Templates</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-md">{templates.map(([icon, title, description, duration]) => <button key={title} onClick={() => setNotice(`${title} is being generated.`)} className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant p-md hover:border-primary transition-colors flex flex-col min-h-[190px]"><div className="flex items-center gap-sm mb-sm"><span className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center"><Icon>{icon}</Icon></span><h4 className="text-label-md text-on-surface font-semibold">{title}</h4></div><p className="text-body-sm text-on-surface-variant flex-grow mb-md">{description}</p><span className="flex items-center gap-xs text-on-surface-variant opacity-70 text-label-sm"><Icon className="text-[16px]">schedule</Icon>Usually takes {duration}</span></button>)}</div></section><section><div className="flex items-center justify-between mb-md"><h3 className="text-headline-sm text-on-surface flex items-center gap-sm"><Icon className="text-primary">history</Icon>Recently Generated</h3><button onClick={() => setNotice("All generated reports are displayed.")} className="text-primary text-label-md hover:underline">View All</button></div><div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="bg-surface-container-low border-b border-outline-variant"><tr>{["Report Name", "Date Generated", "Format", "Status", "Actions"].map((heading) => <th key={heading} className={`py-sm px-md text-label-sm text-on-surface-variant font-semibold ${heading === "Actions" ? "text-right" : ""}`}>{heading}</th>)}</tr></thead><tbody className="text-body-sm">{reports.map(([name, date, format, status]) => { const ready = status === "Ready"; return <tr key={name} className="border-b last:border-0 border-outline-variant hover:bg-surface-container-low"><td className={`py-md px-md font-medium ${!ready ? "text-on-surface-variant" : "text-on-surface"}`}>{name}</td><td className="py-md px-md text-on-surface-variant">{date}</td><td className="py-md px-md"><span className={`inline-flex items-center gap-xs px-2 py-1 rounded bg-surface-container-high text-xs font-medium ${!ready ? "opacity-50" : ""}`}><Icon className="text-[14px]">{format === "PDF" ? "picture_as_pdf" : "csv"}</Icon>{format}</span></td><td className="py-md px-md">{ready ? <span className="inline-flex items-center gap-xs bg-secondary-container/20 px-2 py-1 rounded-full text-xs font-semibold text-secondary"><i className="w-2 h-2 rounded-full bg-secondary-fixed" />Ready</span> : <span className="inline-flex items-center gap-xs bg-surface-variant px-2 py-1 rounded-full text-xs font-semibold text-on-surface-variant"><Icon className="text-[14px] animate-spin">sync</Icon>Generating...</span>}</td><td className="py-md px-md text-right"><button disabled={!ready} onClick={() => { download(`${name.replace(/\W+/g, "-").toLowerCase()}.${format.toLowerCase()}`, `${name}\nGenerated ${date}`, format === "CSV" ? "text/csv;charset=utf-8" : undefined); setNotice(`${name} downloaded.`); }} className="text-primary hover:bg-primary-container/10 p-xs rounded-md disabled:text-on-surface-variant disabled:opacity-50"><Icon className="text-[20px]">download</Icon></button></td></tr>; })}</tbody></table></div></div></section></div><aside className="xl:col-span-4"><div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md xl:sticky xl:top-md shadow-sm"><h3 className="text-headline-sm text-on-surface mb-md flex items-center gap-sm"><Icon className="text-primary">tune</Icon>Custom Report Builder</h3><form onSubmit={(event) => { event.preventDefault(); generateReport(); }} className="space-y-md"><Field label="Data Source"><select><option>Financial &amp; Billing</option><option>Clinical Outcomes</option><option>Operational Efficiency</option><option>Patient Feedback</option></select></Field><div><label className="block text-label-md text-on-surface font-medium mb-xs">Date Range</label><div className="grid grid-cols-2 gap-sm"><input type="date" /><input type="date" /></div></div><Field label="Department Filter"><select><option>All Departments</option><option>Cardiology</option><option>Neurology</option><option>Pediatrics</option></select></Field><Field label="Provider (Optional)"><select><option>Any Provider</option><option>Dr. Alan Smith</option><option>Dr. Sarah Jenkins</option><option>Dr. Emily Chen</option></select></Field><div className="pt-sm border-t border-outline-variant"><label className="block text-label-md text-on-surface font-medium mb-xs">Output Format</label><div className="flex gap-md text-body-sm"><label className="flex items-center gap-xs"><input defaultChecked name="format" type="radio" value="pdf" />PDF (Visual)</label><label className="flex items-center gap-xs"><input name="format" type="radio" value="csv" />CSV (Raw Data)</label></div></div><div className="pt-md flex flex-col gap-sm"><button type="submit" className="w-full bg-primary text-on-primary h-10 rounded-lg text-label-md font-semibold hover:bg-surface-tint flex items-center justify-center gap-sm"><Icon className="text-[18px]">play_circle</Icon>Generate Report</button><button type="button" onClick={() => setNotice("Recurring-report scheduling is ready to configure.")} className="w-full bg-surface-container-lowest text-on-surface h-10 rounded-lg border border-outline-variant text-label-md font-semibold hover:bg-surface-container-low flex items-center justify-center gap-sm"><Icon className="text-[18px]">calendar_clock</Icon>Schedule Recurring...</button></div></form></div></aside></div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className="block text-label-md text-on-surface font-medium mb-xs">{label}</label>{React.cloneElement(children as React.ReactElement, { className: "w-full h-10 bg-background border border-outline-variant rounded-lg px-sm text-body-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:bg-surface outline-none" })}</div>; }
