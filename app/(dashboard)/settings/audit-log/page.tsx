"use client";

import React, { useState } from "react";
import { Download, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuditEvent {
  id: string;
  actor: string;
  role: string;
  action: string;
  resource: string;
  ipAddress: string;
  timestamp: string;
  status: "success" | "warning" | "failed";
}

const mockAuditLogs: AuditEvent[] = [
  { id: "LOG-902", actor: "Dr. Sarah Jenkins", role: "Doctor", action: "UPDATE_PRESCRIPTION", resource: "RX-1092", ipAddress: "192.168.1.42", timestamp: "2026-08-30 14:12:08", status: "success" },
  { id: "LOG-903", actor: "Admin Lead John", role: "Admin", action: "SCALE_MODE_TOGGLE", resource: "System Billing", ipAddress: "192.168.1.10", timestamp: "2026-08-30 12:45:19", status: "warning" },
  { id: "LOG-904", actor: "Front Desk Staff", role: "Front Desk", action: "PATIENT_INTAKE", resource: "PT-8819", ipAddress: "192.168.1.88", timestamp: "2026-08-30 11:20:00", status: "success" },
];

export default function SystemAuditLogPage() {
  const [search, setSearch] = useState("");

  const handleExportCSV = () => {
    const headers = ["Log ID", "Actor", "Role", "Action Executed", "Target Resource", "IP Address", "Timestamp", "Status"];
    const rows = mockAuditLogs.map(log => [
      log.id,
      log.actor,
      log.role,
      log.action,
      log.resource,
      log.ipAddress,
      log.timestamp,
      log.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "medflow_clinic_hipaa_audit_log.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = mockAuditLogs.filter(log => 
    log.actor.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.resource.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-display text-on-surface">System Audit & Compliance Log</h1>
          <p className="text-body-sm text-on-surface-variant">
            Immutable HIPAA-compliant access, modification, and clinical record event trail
          </p>
        </div>

        <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-2 text-xs font-semibold">
          <Download className="w-4 h-4" /> Export CSV Log
        </Button>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-level-2">
        <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
          <div className="relative w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-outline" />
            <input
              type="text"
              placeholder="Search audit trail by actor, action, IP..."
              className="w-full h-10 pl-9 pr-3 py-1.5 text-body-sm bg-surface-container-lowest border border-outline-variant rounded-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="secondary" size="sm" className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5" /> Date Range Filter
          </Button>
        </div>

        <table className="w-full text-left text-body-sm">
          <thead className="bg-surface-container border-b border-outline-variant text-xs text-on-surface-variant font-semibold">
            <tr>
              <th className="p-3.5">Log ID</th>
              <th className="p-3.5">Actor & Role</th>
              <th className="p-3.5">Action Executed</th>
              <th className="p-3.5">Target Resource</th>
              <th className="p-3.5">IP Address</th>
              <th className="p-3.5">Timestamp</th>
              <th className="p-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60 font-mono text-xs">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-surface-container-low/50 transition">
                <td className="p-3.5 font-bold text-primary">{log.id}</td>
                <td className="p-3.5 font-sans">
                  <div className="font-semibold text-on-surface">{log.actor}</div>
                  <div className="text-[10px] text-outline">{log.role}</div>
                </td>
                <td className="p-3.5 text-on-surface">{log.action}</td>
                <td className="p-3.5 text-on-surface-variant">{log.resource}</td>
                <td className="p-3.5 text-outline">{log.ipAddress}</td>
                <td className="p-3.5 text-outline">{log.timestamp}</td>
                <td className="p-3.5 font-sans">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-secondary-fixed text-on-secondary-fixed-variant">
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
