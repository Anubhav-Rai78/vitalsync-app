"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  Activity,
  TrendingUp,
  DollarSign,
  Clock,
  Download,
  FileText,
  SlidersHorizontal,
  Play,
  History,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const patientVolumeData = [
  { day: "Mon", patients: 45, averageWaitTime: 12 },
  { day: "Tue", patients: 52, averageWaitTime: 15 },
  { day: "Wed", patients: 61, averageWaitTime: 18 },
  { day: "Thu", patients: 48, averageWaitTime: 10 },
  { day: "Fri", patients: 70, averageWaitTime: 22 },
  { day: "Sat", patients: 38, averageWaitTime: 8 },
];

const revenueTrendData = [
  { month: "Jan", revenue: 110000 },
  { month: "Feb", revenue: 115000 },
  { month: "Mar", revenue: 108000 },
  { month: "Apr", revenue: 125000 },
  { month: "May", revenue: 135000 },
  { month: "Jun", revenue: 142500 },
];

const specialtyData = [
  { specialty: "Cardio", visits: 420 },
  { specialty: "Peds", visits: 380 },
  { specialty: "Gen Med", visits: 550 },
  { specialty: "Neuro", visits: 210 },
  { specialty: "Ortho", visits: 310 },
];

const peakHoursHeatmap = [
  { hour: "08:00", volume: "Low" },
  { hour: "10:00", volume: "High" },
  { hour: "12:00", volume: "Medium" },
  { hour: "14:00", volume: "High" },
  { hour: "16:00", volume: "Medium" },
  { hour: "18:00", volume: "Low" },
];

const templates = [
  { title: "Monthly Financial Summary", desc: "Breakdown of clinic revenue and margins.", time: "~2 mins" },
  { title: "Patient Demographics", desc: "Age, location, and insurance distribution.", time: "~1 min" },
  { title: "Staff Productivity", desc: "Patient throughput and consult durations.", time: "~3 mins" },
  { title: "Insurance Claim Success", desc: "First-pass acceptance and denial reasons.", time: "~5 mins" },
];

const recentReports = [
  { name: "Q3 Financial Overview", date: "Oct 24, 2026", format: "PDF", status: "Ready" },
  { name: "Staff Throughput Report", date: "Oct 18, 2026", format: "CSV", status: "Ready" },
  { name: "Patient Demographics Q3", date: "Oct 02, 2026", format: "PDF", status: "Ready" },
];

const topDoctors = [
  { name: "Dr. Robert Chen", spec: "Cardiology", visits: 342, score: "4.9" },
  { name: "Dr. Sarah Jenkins", spec: "Pediatrics", visits: 289, score: "4.8" },
  { name: "Dr. Marcus Lee", spec: "General Medicine", visits: 256, score: "4.7" },
];

function triggerDownload(filename: string, content: string, mime = "text/plain;charset=utf-8;") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportReport(report: { name: string; date: string; format: string }) {
  const content = `${report.name}\nGenerated ${report.date}\n\nMedFlow Clinic operational report.`;
  triggerDownload(
    `${report.name.replace(/\s+/g, "_").toLowerCase()}.${report.format.toLowerCase()}`,
    content,
    report.format === "CSV" ? "text/csv;charset=utf-8;" : "text/plain;charset=utf-8;"
  );
}


export default function ReportsAndAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "reports">("overview");

  return (
    <div className="space-y-lg pb-xl">
      {/* Page header with tab toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant pb-4">
        <div>
          <h1 className="text-headline-md font-display text-on-surface">
            {activeTab === "overview" ? "Analytics Overview" : "Detailed Reports"}
          </h1>
          <p className="text-body-sm text-on-surface-variant mt-xs">
            {activeTab === "overview"
              ? "High-level view of clinical and financial performance."
              : "Generate, view, and download comprehensive operational reports."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-surface-container-low p-1 rounded-lg border border-outline-variant flex text-label-md font-semibold">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 rounded-md transition ${activeTab === "overview" ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`px-3 py-1.5 rounded-md transition ${activeTab === "reports" ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              Report Builder
            </button>
          </div>
          <Button variant="secondary" size="sm" className="flex items-center gap-1.5 text-xs" onClick={() => window.print()}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* TAB 1: ANALYTICS OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-level-2">
              <div className="flex items-center justify-between text-outline">
                <span className="text-xs font-semibold uppercase">Weekly Patients</span>
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="text-headline-md font-bold text-on-surface mt-2">314</div>
              <span className="text-[11px] font-semibold text-secondary flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" /> +14.2% from last week
              </span>
            </div>
            <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-level-2">
              <div className="flex items-center justify-between text-outline">
                <span className="text-xs font-semibold uppercase">Avg Wait Time</span>
                <Clock className="w-4 h-4 text-tertiary" />
              </div>
              <div className="text-headline-md font-bold text-on-surface mt-2">14.2m</div>
              <span className="text-[11px] font-semibold text-secondary flex items-center gap-1 mt-1">
                -2.5m reduction
              </span>
            </div>
            <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-level-2">
              <div className="flex items-center justify-between text-outline">
                <span className="text-xs font-semibold uppercase">Doctor Utilization</span>
                <Activity className="w-4 h-4 text-secondary" />
              </div>
              <div className="text-headline-md font-bold text-on-surface mt-2">86.4%</div>
              <span className="text-[11px] font-semibold text-on-surface-variant mt-1">Target: 85%</span>
            </div>
            <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-level-2">
              <div className="flex items-center justify-between text-outline">
                <span className="text-xs font-semibold uppercase">Gross Billing (Mo.)</span>
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
              <div className="text-headline-md font-bold text-on-surface mt-2">$42,910</div>
              <span className="text-[11px] font-semibold text-secondary flex items-center gap-1 mt-1">
                +8.1% vs target
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-5 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-level-2 flex flex-col">
              <h3 className="font-display font-semibold text-on-surface mb-4">Revenue Trends</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e3e5" vertical={false} />
                    <XAxis dataKey="month" stroke="#737686" tick={{ fontSize: 11, fill: "#737686" }} />
                    <YAxis stroke="#737686" tick={{ fontSize: 11, fill: "#737686" }} tickFormatter={(v: any) => `₹${Number(v) / 1000}k`} />
                    <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, "Revenue"]} />
                    <Line type="monotone" dataKey="revenue" stroke="#004ac6" strokeWidth={2.5} dot={{ fill: "#004ac6", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="p-5 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-level-2 flex flex-col">
              <h3 className="font-display font-semibold text-on-surface mb-4">Volume by Specialty</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={specialtyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e3e5" vertical={false} />
                    <XAxis dataKey="specialty" stroke="#737686" tick={{ fontSize: 11, fill: "#737686" }} />
                    <YAxis stroke="#737686" tick={{ fontSize: 11, fill: "#737686" }} />
                    <Tooltip />
                    <Bar dataKey="visits" fill="#004ac6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-level-2">
              <h3 className="font-display font-semibold text-on-surface mb-4">Peak Arrival Hours Heatmap</h3>
              <div className="grid grid-cols-3 gap-3">
                {peakHoursHeatmap.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border text-center ${item.volume === "High" ? "bg-primary-container/20 border-primary text-primary font-bold" : item.volume === "Medium" ? "bg-secondary-container/20 border-secondary text-secondary font-semibold" : "bg-surface-container border-outline-variant text-on-surface-variant"}`}
                  >
                    <div className="text-sm">{item.hour}</div>
                    <div className="text-xs mt-1 uppercase tracking-wider">{item.volume} Load</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-level-2">
            <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-display font-semibold text-on-surface">Top Performing Doctors</h3>
              <button className="text-label-md font-semibold text-primary hover:underline">View All</button>
            </div>
            <table className="w-full text-left text-body-sm">
              <thead className="bg-surface-container-low text-label-sm text-on-surface-variant uppercase font-semibold border-b border-outline-variant">
                <tr>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Specialty</th>
                  <th className="py-3 px-4 text-right">Patient Visits</th>
                  <th className="py-3 px-4 text-right">Satisfaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {topDoctors.map((doc, idx) => (
                  <tr key={idx} className="hover:bg-surface-container-low/50">
                    <td className="py-3 px-4 font-semibold text-on-surface flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary-container/20 text-primary flex items-center justify-center font-bold text-[10px]">
                        {doc.name.replace("Dr. ", "").slice(0, 2).toUpperCase()}
                      </div>
                      {doc.name}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant">{doc.spec}</td>
                    <td className="py-3 px-4 text-right font-bold text-on-surface">{doc.visits}</td>
                    <td className="py-3 px-4 text-right font-bold text-secondary flex items-center justify-end gap-1 mt-2">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {doc.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED REPORTS */}
      {activeTab === "reports" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 space-y-6">
            <div>
              <h3 className="text-headline-sm text-on-surface mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Report Templates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-outline-variant bg-surface-container-lowest hover:border-primary transition cursor-pointer shadow-xs group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-body-md text-on-surface group-hover:text-primary">{t.title}</h4>
                      <Play className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <p className="text-body-sm text-on-surface-variant mb-3">{t.desc}</p>
                    <span className="text-label-sm text-on-surface-variant font-medium">Takes {t.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-headline-sm text-on-surface mb-3 flex items-center gap-2">
                <History className="w-4 h-4 text-primary" /> Recently Generated Reports
              </h3>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-xs text-body-sm">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low border-b border-outline-variant text-label-sm text-on-surface-variant uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Report Name</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Format</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {recentReports.map((r, idx) => (
                      <tr key={idx} className="hover:bg-surface-container-low/50">
                        <td className="py-3 px-4 font-semibold text-on-surface">{r.name}</td>
                        <td className="py-3 px-4 text-on-surface-variant">{r.date}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-surface-container font-bold text-label-sm">{r.format}</span>
                        </td>
                        <td className="py-3 px-4"><span className="text-secondary font-bold text-label-sm">{r.status}</span></td>
                        <td className="py-3 px-4 text-right">
                          <button onClick={() => exportReport(r)} title="Download" className="text-primary hover:bg-primary-container/20 rounded p-1.5 transition-colors">
                            <Download className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="xl:col-span-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm space-y-4 text-body-sm">
              <h3 className="text-headline-sm text-on-surface flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" /> Custom Report Builder
              </h3>
              <div>
                <label className="font-semibold text-on-surface block mb-1">Data Source</label>
                <select className="w-full h-10 px-3 border border-outline-variant rounded-lg outline-none bg-surface-container-lowest focus:border-primary">
                  <option>Financial &amp; Billing</option>
                  <option>Clinical Outcomes</option>
                  <option>Operational Efficiency</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-on-surface block mb-1">Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className="h-10 px-3 border border-outline-variant rounded-lg outline-none text-body-sm" />
                  <input type="date" className="h-10 px-3 border border-outline-variant rounded-lg outline-none text-body-sm" />
                </div>
              </div>
              <div>
                <label className="font-semibold text-on-surface block mb-1">Department Filter</label>
                <select className="w-full h-10 px-3 border border-outline-variant rounded-lg outline-none bg-surface-container-lowest focus:border-primary">
                  <option>All Departments</option>
                  <option>Cardiology</option>
                  <option>Pediatrics</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-on-surface block mb-1">Provider</label>
                <select className="w-full h-10 px-3 border border-outline-variant rounded-lg outline-none bg-surface-container-lowest focus:border-primary">
                  <option>All Providers</option>
                  <option>Dr. Robert Chen</option>
                  <option>Dr. Sarah Jenkins</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-on-surface block mb-1">Output Format</label>
                <select className="w-full h-10 px-3 border border-outline-variant rounded-lg outline-none bg-surface-container-lowest focus:border-primary">
                  <option>PDF</option>
                  <option>CSV</option>
                  <option>Excel</option>
                </select>
              </div>
              <Button className="w-full">Generate Report</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
