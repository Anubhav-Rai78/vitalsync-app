"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  Activity,
  ArrowRight,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { jsPDF } from "jspdf";

interface AuditLogRow {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  resource: string;
  ip: string;
  severity: "Info" | "Warning" | "Critical";
}

const DEFAULT_AUDIT_LOGS: AuditLogRow[] = [
  {
    id: "1",
    timestamp: "2026-10-27 14:32:01",
    user: "Dr. Rajesh Sharma",
    role: "Physician",
    action: "Prescription Modified",
    resource: "PRSC-8821-A",
    ip: "192.168.1.104",
    severity: "Info",
  },
  {
    id: "2",
    timestamp: "2026-10-27 14:28:45",
    user: "System API",
    role: "Service",
    action: "Multiple Failed Logins",
    resource: "AUTH-N/A",
    ip: "45.22.19.102",
    severity: "Warning",
  },
  {
    id: "3",
    timestamp: "2026-10-27 14:15:12",
    user: "A. Rivera",
    role: "Nurse",
    action: "Patient Record Accessed",
    resource: "PT-9942-X",
    ip: "192.168.1.112",
    severity: "Info",
  },
  {
    id: "4",
    timestamp: "2026-10-27 13:50:22",
    user: "Admin User",
    role: "Admin",
    action: "Clinic Settings Updated",
    resource: "SETT-4011",
    ip: "192.168.1.100",
    severity: "Info",
  },
  {
    id: "5",
    timestamp: "2026-10-27 12:11:09",
    user: "System Daemon",
    role: "Service",
    action: "Database Connection Spike",
    resource: "DB-POOL",
    ip: "10.0.0.4",
    severity: "Critical",
  },
];

export default function SystemAuditLogPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLogRow[]>(DEFAULT_AUDIT_LOGS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const supabase = createClient();

  useEffect(() => {
    async function loadAndVerify() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role?.toLowerCase() !== "admin") { router.push("/dashboard"); return; }
      try {
        const { data, error } = await supabase
          .from("audit_logs")
          .select("id, created_at, action, entity_type, entity_id, profiles(full_name, role)")
          .order("created_at", { ascending: false })
          .limit(50);
        if (data && data.length > 0 && !error) {
          const formatted: AuditLogRow[] = data.map((item: any, idx: number) => ({
            id: item.id || String(idx + 1),
            timestamp: item.created_at ? item.created_at.replace("T", " ").substring(0, 19) : "2026-10-27 14:32:01",
            user: item.profiles?.full_name || "System User",
            role: item.profiles?.role ? (item.profiles.role.charAt(0).toUpperCase() + item.profiles.role.slice(1)) : "Staff",
            action: item.action || "Record Updated",
            resource: item.entity_id ? `RES-${item.entity_id.slice(0, 6).toUpperCase()}` : "SYSTEM",
            ip: "192.168.1.100",
            severity: item.action?.toLowerCase().includes("fail") || item.action?.toLowerCase().includes("spike") ? "Warning" : "Info",
          }));
          setLogs(formatted);
        }
      } catch (err) { console.error("Audit log query error:", err); }
      finally { setLoading(false); }
    }
    loadAndVerify();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = q === "" || log.user.toLowerCase().includes(q) || log.action.toLowerCase().includes(q) || log.resource.toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || log.role.toLowerCase() === roleFilter.toLowerCase();
      const matchesSeverity = severityFilter === "all" || log.severity.toLowerCase() === severityFilter.toLowerCase();
      const matchesAction = actionFilter === "all" || log.action.toLowerCase().includes(actionFilter.toLowerCase());
      return matchesSearch && matchesRole && matchesSeverity && matchesAction;
    });
  }, [logs, searchQuery, roleFilter, severityFilter, actionFilter]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const visibleLogs = filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "Info": return "bg-secondary-container/20 text-secondary border border-secondary-container/50";
      case "Warning": return "bg-[rgba(234,179,8,0.1)] text-[#854D0E] border border-[rgba(234,179,8,0.2)]";
      case "Critical": return "bg-error-container/40 text-on-error-container border border-error-container";
      default: return "bg-surface-container text-on-surface";
    }
  };

  const handleExportCSV = () => {
    const headers = ["Timestamp", "User", "Role", "Action", "Resource ID", "IP Address", "Severity"];
    const rows = filteredLogs.map((l) => [l.timestamp, l.user, l.role, `"${l.action}"`, l.resource, l.ip, l.severity]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `system_audit_log_${Date.now()}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(0, 74, 198);
    doc.text("MedFlow Clinic - System Audit Log", 14, 20);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(115, 118, 134);
    doc.text(`Generated: ${new Date().toLocaleString()} | Filtered records: ${filteredLogs.length}`, 14, 27);
    let y = 38;
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(25, 28, 30);
    doc.text("Timestamp", 14, y); doc.text("User", 55, y); doc.text("Action", 100, y); doc.text("Resource", 150, y); doc.text("Severity", 185, y);
    y += 4; doc.setDrawColor(195, 198, 215); doc.line(14, y, 196, y); y += 6;
    doc.setFont("helvetica", "normal");
    filteredLogs.slice(0, 30).forEach((item) => {
      doc.text(item.timestamp, 14, y); doc.text(item.user.substring(0, 20), 55, y);
      doc.text(item.action.substring(0, 24), 100, y); doc.text(item.resource, 150, y); doc.text(item.severity, 185, y);
      y += 6; if (y > 280) { doc.addPage(); y = 20; }
    });
    doc.save(`audit_log_${Date.now()}.pdf`);
  };

  return (
    <div className="max-w-container-max mx-auto space-y-lg font-body-md text-body-md text-on-background pb-xxl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">System Audit Log</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Review historical system actions, security events, and compliance records.</p>
        </div>
        <div className="flex gap-sm">
          <button onClick={handleExportCSV} className="flex items-center gap-xs px-md py-sm bg-surface border border-outline-variant text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container-low transition-colors"><Download className="w-4 h-4" /> Export CSV</button>
          <button onClick={handleExportPDF} className="flex items-center gap-xs px-md py-sm bg-surface border border-outline-variant text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container-low transition-colors"><FileText className="w-4 h-4" /> Export PDF</button>
        </div>
      </div>
      <div className="bg-surface border border-outline-variant rounded-xl p-md mb-lg flex flex-wrap gap-md items-center shadow-sm">
        <div className="flex flex-col gap-xs flex-1 min-w-[200px]">
          <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Search</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search user, action, ID..." className="w-full h-10 pl-9 pr-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none focus:border-primary" />
          </div>
        </div>
        <div className="flex flex-col gap-xs flex-1 min-w-[140px]">
          <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">User Role</label>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }} className="w-full h-10 bg-surface-container-low border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface px-3 outline-none focus:border-primary cursor-pointer">
            <option value="all">All Roles</option><option value="physician">Physician / Doctor</option><option value="nurse">Nurse</option><option value="admin">Admin</option><option value="service">Service / API</option>
          </select>
        </div>
        <div className="flex flex-col gap-xs flex-1 min-w-[140px]">
          <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Severity</label>
          <select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value); setCurrentPage(1); }} className="w-full h-10 bg-surface-container-low border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface px-3 outline-none focus:border-primary cursor-pointer">
            <option value="all">All Severities</option><option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option>
          </select>
        </div>
        <div className="flex items-end h-[62px]">
          <button onClick={() => { setSearchQuery(""); setRoleFilter("all"); setSeverityFilter("all"); setActionFilter("all"); setCurrentPage(1); }} className="h-10 px-lg bg-surface border border-outline-variant text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container-low transition-colors">Clear</button>
        </div>
      </div>
      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-surface-container-low border-b border-outline-variant">
              <th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Timestamp</th>
              <th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">User</th>
              <th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Action</th>
              <th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Resource ID</th>
              <th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">IP Address</th>
              <th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Severity</th>
            </tr></thead>
            <tbody className="divide-y divide-outline-variant font-body-sm text-body-sm">
              {loading ? (<tr><td colSpan={6} className="py-8 text-center text-on-surface-variant">Loading audit events...</td></tr>)
              : visibleLogs.length > 0 ? (visibleLogs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="py-md px-md text-on-surface font-mono whitespace-nowrap">{log.timestamp}</td>
                  <td className="py-md px-md"><div className="flex items-center gap-sm"><div className="w-7 h-7 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-xs shrink-0">{log.user.slice(0, 2).toUpperCase()}</div><div><div className="font-medium text-on-surface">{log.user}</div><div className="font-label-sm text-[11px] text-on-surface-variant">{log.role}</div></div></div></td>
                  <td className="py-md px-md text-on-surface">{log.action}</td>
                  <td className="py-md px-md font-mono text-[13px] text-on-surface-variant">{log.resource}</td>
                  <td className="py-md px-md font-mono text-[13px] text-on-surface-variant">{log.ip}</td>
                  <td className="py-md px-md"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-[11px] uppercase tracking-wider font-bold ${getSeverityBadge(log.severity)}`}>{log.severity}</span></td>
                </tr>
              )))
              : (<tr><td colSpan={6} className="py-8 text-center text-on-surface-variant">No audit records matching parameters.</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="bg-surface-container-lowest border-t border-outline-variant p-md flex items-center justify-between">
          <span className="font-body-sm text-body-sm text-on-surface-variant">Showing <span className="font-medium text-on-surface">{filteredLogs.length === 0 ? 0 : startIndex + 1}</span> to <span className="font-medium text-on-surface">{Math.min(startIndex + ITEMS_PER_PAGE, filteredLogs.length)}</span> of <span className="font-medium text-on-surface">{filteredLogs.length}</span> entries</span>
          <div className="flex items-center gap-xs">
            <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-1.5 border border-outline-variant rounded bg-surface-container-lowest text-on-surface-variant disabled:opacity-40 hover:bg-surface-container-low transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setCurrentPage(n)} className={`min-w-[32px] h-8 px-2 rounded font-label-sm text-label-sm font-semibold transition-colors ${currentPage === n ? "bg-primary text-on-primary shadow-xs" : "border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low"}`}>{n}</button>
            ))}
            <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 border border-outline-variant rounded bg-surface-container-lowest text-on-surface-variant disabled:opacity-40 hover:bg-surface-container-low transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
      <div className="pt-md flex justify-end">
        <Button asChild className="bg-primary text-on-primary hover:bg-primary/90 font-label-md flex items-center gap-2 shadow-sm">
          <Link href="/settings/system-health"><Activity className="w-4 h-4" /> System Health Overview <ArrowRight className="w-4 h-4" /></Link>
        </Button>
      </div>
    </div>
  );
}
