"use client";

import React, { useMemo, useState } from "react";
import { Download, FileText, Filter, Search, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Severity = "Info" | "Warning" | "Critical";

interface AuditEvent {
  id: string;
  actor: string;
  role: "Physician" | "Nurse" | "Admin" | "System";
  action: string;
  resource: string;
  ipAddress: string;
  timestamp: string;
  severity: Severity;
}

const auditLogs: AuditEvent[] = [
  { id: "LOG-902", actor: "Dr. Sarah Jenkins", role: "Physician", action: "Prescription Modified", resource: "PRSC-8821-A", ipAddress: "192.168.1.42", timestamp: "2026-10-27 14:32:01", severity: "Info" },
  { id: "LOG-903", actor: "System API", role: "System", action: "Multiple Failed Logins", resource: "AUTH-N/A", ipAddress: "45.22.19.102", timestamp: "2026-10-27 14:28:45", severity: "Warning" },
  { id: "LOG-904", actor: "A. Rivera", role: "Nurse", action: "Patient Record Accessed", resource: "PT-9942-X", ipAddress: "192.168.1.112", timestamp: "2026-10-27 14:15:12", severity: "Info" },
  { id: "LOG-905", actor: "Admin Lead John", role: "Admin", action: "Clinic Configuration Changed", resource: "CLINIC-SETTINGS", ipAddress: "192.168.1.10", timestamp: "2026-10-26 09:42:03", severity: "Critical" },
];

const SEVERITY_STYLE: Record<Severity, string> = {
  Info: "bg-secondary-container/40 text-secondary border border-secondary/30",
  Warning: "bg-[#f59e0b]/10 text-[#92400e] border border-[#f59e0b]/30",
  Critical: "bg-error-container text-on-error-container border border-error/30",
};

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function SystemAuditLogPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [actionType, setActionType] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return auditLogs.filter((log) => {
      const matchesSearch = !q || [log.actor, log.action, log.resource, log.ipAddress].some((v) => v.toLowerCase().includes(q));
      const matchesRole = role === "all" || log.role.toLowerCase() === role;
      const matchesSeverity = severity === "all" || log.severity.toLowerCase() === severity;
      const matchesAction = actionType === "all" || log.action.toLowerCase().includes(actionType);
      if (dateRange === "today") return log.timestamp.startsWith("2026-10-27");
      if (dateRange === "week") return log.timestamp >= "2026-10-20";
      return matchesSearch && matchesRole && matchesSeverity && matchesAction;
    }).filter((log) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || [log.actor, log.action, log.resource, log.ipAddress].some((v) => v.toLowerCase().includes(q));
      const matchesRole = role === "all" || log.role.toLowerCase() === role;
      const matchesSeverity = severity === "all" || log.severity.toLowerCase() === severity;
      const matchesAction = actionType === "all" || log.action.toLowerCase().includes(actionType);
      const matchesDate = dateRange === "all" || (dateRange === "today" ? log.timestamp.startsWith("2026-10-27") : log.timestamp >= "2026-10-20");
      return matchesSearch && matchesRole && matchesSeverity && matchesAction && matchesDate;
    });
  }, [search, role, severity, dateRange, actionType]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filteredLogs.slice((safePage - 1) * pageSize, safePage * pageSize);

  const exportCsv = () => {
    const headers = ["Timestamp", "User", "Role", "Action", "Resource ID", "IP Address", "Severity"];
    const content = [headers.join(","), ...filteredLogs.map((log) => [log.timestamp, log.actor, log.role, log.action, log.resource, log.ipAddress, log.severity].join(","))].join("\n");
    download("medflow_system_audit_log.csv", content, "text/csv;charset=utf-8;");
  };

  return (
    <div className="space-y-6 pb-xl">
      <div>
        <Link href="/settings" className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-on-surface-variant hover:text-primary transition mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-headline-md font-display text-on-surface">System Audit Log</h1>
            <p className="text-body-sm text-on-surface-variant">Review historical system actions, security events, and compliance records.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={exportCsv} className="flex items-center gap-1.5 text-xs"><Download className="w-3.5 h-3.5" /> Export CSV</Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()} className="flex items-center gap-1.5 text-xs"><FileText className="w-3.5 h-3.5" /> Export PDF</Button>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-wrap gap-3 items-end shadow-sm">
        <div className="relative flex-1 min-w-[220px]">
          <label className="block text-label-sm text-on-surface-variant mb-1">Search</label>
          <Search className="w-4 h-4 absolute left-3 bottom-3 text-outline" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search user, action, IP..." className="w-full h-10 pl-9 pr-3 border border-outline-variant rounded-lg bg-surface-container-lowest text-body-sm focus:border-primary outline-none" />
        </div>
        <div><label className="block text-label-sm text-on-surface-variant mb-1">Date Range</label><select value={dateRange} onChange={(e) => { setDateRange(e.target.value); setPage(1); }} className="h-10 px-3 border border-outline-variant rounded-lg bg-surface-container-lowest text-body-sm"><option value="all">All Time</option><option value="today">Today</option><option value="week">Last 7 Days</option></select></div>
        <div><label className="block text-label-sm text-on-surface-variant mb-1">User Role</label><select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="h-10 px-3 border border-outline-variant rounded-lg bg-surface-container-lowest text-body-sm"><option value="all">All Roles</option><option value="physician">Physician</option><option value="nurse">Nurse</option><option value="admin">Admin</option><option value="system">System</option></select></div>
        <div><label className="block text-label-sm text-on-surface-variant mb-1">Action Type</label><select value={actionType} onChange={(e) => { setActionType(e.target.value); setPage(1); }} className="h-10 px-3 border border-outline-variant rounded-lg bg-surface-container-lowest text-body-sm"><option value="all">All Actions</option><option value="prescription">Prescriptions</option><option value="patient">Patients</option><option value="login">Authentication</option><option value="configuration">Configuration</option></select></div>
        <div><label className="block text-label-sm text-on-surface-variant mb-1">Severity</label><select value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1); }} className="h-10 px-3 border border-outline-variant rounded-lg bg-surface-container-lowest text-body-sm"><option value="all">All Severities</option><option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option></select></div>
        <button onClick={() => { setSearch(""); setRole("all"); setSeverity("all"); setDateRange("all"); setActionType("all"); setPage(1); }} className="h-10 px-3 rounded-lg border border-outline-variant text-body-sm font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Reset</button>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-level-2">
        <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-body-sm">
          <thead className="bg-surface-container-low border-b border-outline-variant text-label-sm text-on-surface-variant font-semibold"><tr><th className="p-3.5">Timestamp</th><th className="p-3.5">User</th><th className="p-3.5">Action</th><th className="p-3.5">Resource ID</th><th className="p-3.5">IP Address</th><th className="p-3.5">Severity</th></tr></thead>
          <tbody className="divide-y divide-outline-variant/60 font-mono text-xs">
            {rows.length === 0 ? <tr><td colSpan={6} className="p-xl text-center font-sans text-body-sm text-on-surface-variant">No audit events matched your filters.</td></tr> : rows.map((log) => <tr key={log.id} className="hover:bg-surface-container-low/50 transition"><td className="p-3.5 text-outline">{log.timestamp}</td><td className="p-3.5 font-sans"><div className="font-semibold text-on-surface">{log.actor}</div><div className="text-[10px] text-outline">{log.role}</div></td><td className="p-3.5 text-on-surface">{log.action}</td><td className="p-3.5 text-on-surface-variant">{log.resource}</td><td className="p-3.5 text-outline">{log.ipAddress}</td><td className="p-3.5 font-sans"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-bold ${SEVERITY_STYLE[log.severity]}`}>{log.severity}</span></td></tr>)}
          </tbody>
        </table></div>
        <div className="px-4 py-3 border-t border-outline-variant flex items-center justify-between text-body-sm text-on-surface-variant"><span>Showing {filteredLogs.length === 0 ? 0 : (safePage - 1) * pageSize + 1} to {Math.min(safePage * pageSize, filteredLogs.length)} of {filteredLogs.length} entries</span><div className="flex items-center gap-1"><button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><button className="w-7 h-7 rounded border border-primary/40 bg-primary-container/20 text-primary font-semibold">{safePage}</button><button disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div></div>
      </div>
    </div>
  );
}
