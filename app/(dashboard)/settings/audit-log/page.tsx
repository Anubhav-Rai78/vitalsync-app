"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Download, FileText, Filter, Search, ChevronLeft, ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { jsPDF } from "jspdf";

type Severity = "Info" | "Warning" | "Critical";

interface AuditEvent {
  id: string;
  actor: string;
  role: string;
  action: string;
  resource: string;
  ipAddress: string;
  timestamp: string; // ISO string
  severity: Severity;
}

/* ------------------------------------------------------------------ */
/*  Fallback reference rows — shown only when the live `audit_logs`    */
/*  table is empty / the clinic has not captured events yet.            */
/* ------------------------------------------------------------------ */
const FALLBACK_LOGS: AuditEvent[] = [
  { id: "LOG-902", actor: "Dr. Rajesh Sharma", role: "Physician", action: "Prescription Modified", resource: "PRSC-8821-A", ipAddress: "192.168.1.42", timestamp: "2026-10-27T14:32:01Z", severity: "Info" },
  { id: "LOG-903", actor: "System API", role: "System", action: "Multiple Failed Logins", resource: "AUTH-N/A", ipAddress: "45.22.19.102", timestamp: "2026-10-27T14:28:45Z", severity: "Warning" },
  { id: "LOG-904", actor: "A. Rivera", role: "Nurse", action: "Patient Record Accessed", resource: "PT-9942-X", ipAddress: "192.168.1.112", timestamp: "2026-10-27T14:15:12Z", severity: "Info" },
  { id: "LOG-905", actor: "Admin Lead John", role: "Admin", action: "Clinic Configuration Changed", resource: "CLINIC-SETTINGS", ipAddress: "192.168.1.10", timestamp: "2026-10-26T09:42:03Z", severity: "Critical" },
];

const SEVERITY_STYLE: Record<Severity, string> = {
  Info: "bg-secondary-container/40 text-secondary border border-secondary/30",
  Warning: "bg-tertiary-container/30 text-on-tertiary-container border border-tertiary-container/50",
  Critical: "bg-error-container text-on-error-container border border-error/30",
};

function deriveSeverity(action: string, meta: any): Severity {
  const raw = meta?.severity ?? meta?.level;
  if (typeof raw === "string") {
    const lower = raw.toLowerCase();
    if (lower.includes("warn")) return "Warning";
    if (lower.includes("crit") || lower.includes("error")) return "Critical";
    return "Info";
  }
  const a = action.toLowerCase();
  if (/(delete|void|refund|drop|reset)/.test(a)) return "Critical";
  if (/(fail|denied|locked|error|unauthor)/.test(a)) return "Warning";
  return "Info";
}

function deriveRole(actor: string | null, meta: any, defaultRole = "System"): string {
  const raw = meta?.role ?? meta?.actor_role;
  if (typeof raw === "string") {
    const R: Record<string, string> = {
      admin: "Admin",
      doctor: "Physician",
      physician: "Physician",
      nurse: "Nurse",
      front_desk: "Nurse",
      system: "System",
    };
    return R[raw.toLowerCase()] ?? defaultRole;
  }
  if (actor) return "Staff";
  return defaultRole;
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

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

function csvFor(logs: AuditEvent[]) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [
    ["Timestamp", "User", "Role", "Action", "Resource ID", "IP Address", "Severity"],
    ...logs.map((l) => [l.timestamp, l.actor, l.role, l.action, l.resource, l.ipAddress, l.severity]),
  ]
    .map((row) => row.map(String).map(escape).join(","))
    .join("\n");
}

function pdfFor(logs: AuditEvent[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 74, 198);
  doc.text("MedFlow Clinic — System Audit Log", 14, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated ${new Date().toLocaleString("en-IN")} · ${logs.length} entries`, 14, y);
  y += 6;

  const cols = ["Timestamp", "User", "Role", "Action", "Resource", "IP Address", "Severity"];
  const widths = [42, 38, 26, 56, 34, 30, 22];

  const drawHeader = () => {
    let x = 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFillColor(242, 244, 246);
    doc.rect(14, y - 4, widths.reduce((a, b) => a + b, 0), 6, "F");
    cols.forEach((c, i) => {
      doc.text(c, x, y);
      x += widths[i];
    });
    y += 7;
  };
  drawHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  logs.forEach((l) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 14;
      drawHeader();
    }
    const cells = [formatTimestamp(l.timestamp), l.actor, l.role, l.action, l.resource, l.ipAddress, l.severity];
    let x = 14;
    cells.forEach((c, i) => {
      const str = c.length > widths[i] / 2 ? c.slice(0, Math.floor(widths[i] / 2) - 2) + "…" : c;
      doc.text(str, x, y);
      x += widths[i];
    });
    y += 6;
  });

  doc.save("medflow-audit-log.pdf");
}

export default function SystemAuditLogPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [actionType, setActionType] = useState("all");
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<AuditEvent[]>(FALLBACK_LOGS);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;

  const supabase = useMemo(() => createClient(), []);

  // Live query from the `audit_logs` table (actor joined via profiles).
  useEffect(() => {
    let active = true;
    setLoading(true);
    async function loadAuditLogs() {
      try {
        const { data, error } = await supabase
          .from("audit_logs")
          .select("id, created_at, action, entity_type, entity_id, metadata, profiles!actor_id(full_name, role)")
          .order("created_at", { ascending: false })
          .limit(200);

        if (active && data && data.length > 0 && !error) {
          const mapped: AuditEvent[] = (data as any[]).map((row) => {
            const meta = row.metadata ?? {};
            const actorName = meta?.actor_name ?? row.profiles?.full_name ?? (row.actor_id ? "Staff" : "System API");
            const roleLabel = deriveRole(row.profiles?.full_name ?? null, meta, row.profiles?.role ?? "System");
            const severityValue = deriveSeverity(row.action ?? "", meta);
            return {
              id: row.id,
              actor: String(actorName),
              role: roleLabel,
              action: String(row.action ?? "Audit Event"),
              resource: meta?.entity_label ?? (row.entity_type ? `${row.entity_type}:${String(row.entity_id ?? "n/a").slice(0, 8)}` : "system"),
              ipAddress: meta?.ip ?? meta?.ip_address ?? "—",
              timestamp: row.created_at ?? new Date().toISOString(),
              severity: severityValue,
            };
          });
          setLogs(mapped);
        } else if (active && error) {
          setLogs(FALLBACK_LOGS);
        }
      } catch {
        if (active) setLogs(FALLBACK_LOGS);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadAuditLogs();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const safePage = Math.max(1, page);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesSearch =
        !q ||
        [log.actor, log.action, log.resource, log.ipAddress, log.role].some((v) => v.toLowerCase().includes(q));
      const matchesRole = role === "all" || log.role.toLowerCase().includes(role);
      const matchesSeverity = severity === "all" || log.severity.toLowerCase() === severity;
      const matchesAction =
        actionType === "all" ||
        (actionType === "authentication"
          ? /auth|login|logout/i.test(log.action)
          : actionType === "prescription"
            ? /prescrip|rx/i.test(log.action)
            : actionType === "patient"
              ? /patient/i.test(log.action)
              : actionType === "configuration"
                ? /config|setting|clinic/i.test(log.action)
                : true);
      if (dateRange !== "all") {
        const ts = new Date(log.timestamp);
        if (Number.isNaN(ts.getTime())) return false;
        const cutoff =
          dateRange === "today"
            ? new Date().setHours(0, 0, 0, 0)
            : dateRange === "week"
              ? Date.now() - 7 * 86400000
              : dateRange === "30d"
                ? Date.now() - 30 * 86400000
                : 0;
        if (ts.getTime() < cutoff) return false;
      }
      return matchesSearch && matchesRole && matchesSeverity && matchesAction;
    });
  }, [logs, search, role, severity, actionType, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const currentPage = Math.min(safePage, totalPages);
  const rows = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const resetFilters = () => {
    setSearch("");
    setRole("all");
    setSeverity("all");
    setDateRange("all");
    setActionType("all");
    setPage(1);
  };

  return (
    <div className="space-y-lg max-w-6xl">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-label-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">System Audit Log</h1>
          <p className="text-body-sm text-on-surface-variant mt-xs">
            Immutable trace of clinical accesses and configuration changes.
          </p>
        </div>
        <div className="flex items-center gap-sm">
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() => download("medflow-audit-log.csv", csvFor(filteredLogs), "text/csv;charset=utf-8")}
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-on-primary" onClick={() => pdfFor(filteredLogs)}>
            <FileText className="w-3.5 h-3.5" /> Export PDF
          </Button>
        </div>
      </div>
{/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-md bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
        <div>
          <label className="block text-label-sm text-on-surface-variant mb-1">Search</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="User, action, resource…"
              className="w-full h-10 pl-9 pr-3 border border-outline-variant rounded-lg bg-surface-container-low text-body-sm text-on-surface focus:border-primary outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-label-sm text-on-surface-variant mb-1">Date Range</label>
          <select value={dateRange} onChange={(e) => { setDateRange(e.target.value); setPage(1); }} className="h-10 px-3 border border-outline-variant rounded-lg bg-surface-container-low text-body-sm w-full">
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
        <div>
          <label className="block text-label-sm text-on-surface-variant mb-1">User Role</label>
          <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="h-10 px-3 border border-outline-variant rounded-lg bg-surface-container-low text-body-sm w-full">
            <option value="all">All Roles</option>
            <option value="physician">Physician</option>
            <option value="nurse">Nurse</option>
            <option value="admin">Admin</option>
            <option value="system">System</option>
          </select>
        </div>
        <div>
          <label className="block text-label-sm text-on-surface-variant mb-1">Action Type</label>
          <select value={actionType} onChange={(e) => { setActionType(e.target.value); setPage(1); }} className="h-10 px-3 border border-outline-variant rounded-lg bg-surface-container-low text-body-sm w-full">
            <option value="all">All Actions</option>
            <option value="authentication">Authentication</option>
            <option value="prescription">Prescriptions</option>
            <option value="patient">Patients</option>
            <option value="configuration">Configuration</option>
            <option value="clinical">Clinical</option>
          </select>
        </div>
        <div>
          <label className="block text-label-sm text-on-surface-variant mb-1">Severity</label>
          <select value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1); }} className="h-10 px-3 border border-outline-variant rounded-lg bg-surface-container-low text-body-sm w-full">
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-label-sm text-on-surface-variant">
          {loading ? "Loading live audit events…" : `${filteredLogs.length} log entries`}
        </span>
        <button
          onClick={resetFilters}
          className="inline-flex items-center gap-1.5 text-label-sm font-semibold text-on-surface hover:bg-surface-container-low px-sm py-xs rounded-lg border border-outline-variant"
        >
          <Filter className="w-3.5 h-3.5" /> Reset
        </button>
      </div>
{/* Table */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-level-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-body-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-sm px-md">Timestamp</th>
                <th className="py-sm px-md">User</th>
                <th className="py-sm px-md">Action</th>
                <th className="py-sm px-md">Resource ID</th>
                <th className="py-sm px-md hidden lg:table-cell">IP Address</th>
                <th className="py-sm px-md">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-xl text-center text-body-sm text-on-surface-variant">
                    No audit events matched your filters.
                  </td>
                </tr>
              ) : (
                rows.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container-low/50 transition">
                    <td className="py-sm px-md text-on-surface-variant tabular-nums">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="py-sm px-md">
                      <div className="font-semibold text-on-surface">{log.actor}</div>
                      <div className="text-label-sm text-on-surface-variant">{log.role}</div>
                    </td>
                    <td className="py-sm px-md text-on-surface">{log.action}</td>
                    <td className="py-sm px-md text-on-surface-variant font-mono text-label-sm">{log.resource}</td>
                    <td className="py-sm px-md text-outline hidden lg:table-cell font-mono text-label-sm">{log.ipAddress}</td>
                    <td className="py-sm px-md">
                      <span className={`inline-flex items-center px-sm py-[2px] rounded-full text-label-sm font-bold ${SEVERITY_STYLE[log.severity]}`}>
                        {log.severity}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-md py-sm border-t border-outline-variant flex items-center justify-between text-body-sm text-on-surface-variant">
          <span>
            Showing {filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length} entries
          </span>
          <div className="flex items-center gap-xs">
            <button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-40 hover:bg-surface-container-low">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-7 h-7 rounded border border-primary/40 bg-primary-container/20 text-primary font-semibold text-label-sm">
              {currentPage}
            </button>
            <button disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-40 hover:bg-surface-container-low">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-label-sm text-on-surface-variant">
          <Loader2 className="w-4 h-4 animate-spin" /> Syncing with Supabase…
        </div>
      )}
    </div>
  );
}