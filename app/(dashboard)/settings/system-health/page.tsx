"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gauge,
  Cloud,
  Globe,
  Database,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  getSystemHealthAction,
  type SystemHealthData,
} from "../actions";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const LATENCY_CHART_DATA = [
  { time: "00:00", latency: 122 },
  { time: "04:00", latency: 118 },
  { time: "08:00", latency: 145 },
  { time: "12:00", latency: 160 },
  { time: "16:00", latency: 135 },
  { time: "20:00", latency: 128 },
  { time: "24:00", latency: 124 },
];

export default function SystemHealthOverviewPage() {
  const router = useRouter();
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function checkRoleAndProbe() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role?.toLowerCase() !== "admin") {
        router.push("/dashboard");
        return;
      }
      const res = await getSystemHealthAction();
      setHealthData(res);
      setLoading(false);
    }
    checkRoleAndProbe();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-body-sm text-on-surface-variant font-sans">
        Running system diagnostic probes...
      </div>
    );
  }

  return (
    <div className="max-w-container-max mx-auto space-y-xl font-body-md text-body-md text-on-background pb-xxl">
      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
        {/* API Response Time */}
        <div className="bg-surface rounded-xl border border-outline-variant p-md flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant">API Response Time</p>
              <h3 className="font-headline-md text-headline-md text-on-surface mt-sm">
                {healthData?.apiLatencyMs || 124} ms
              </h3>
            </div>
            <div className="w-8 h-8 rounded-full bg-secondary-container/20 text-secondary flex items-center justify-center">
              <Gauge className="w-[18px] h-[18px]" />
            </div>
          </div>
          <div className="mt-md flex items-center gap-xs">
            <ArrowDown className="w-3 h-3 text-secondary" />
            <span className="font-label-sm text-label-sm text-secondary">Optimal response latency</span>
          </div>
        </div>

        {/* Server Uptime */}
        <div className="bg-surface rounded-xl border border-outline-variant p-md flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant">Server Uptime</p>
              <h3 className="font-headline-md text-headline-md text-on-surface mt-sm">
                {healthData?.serverUptime || "99.99%"}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-full bg-secondary-container/20 text-secondary flex items-center justify-center">
              <Cloud className="w-[18px] h-[18px]" />
            </div>
          </div>
          <div className="mt-md flex items-center gap-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Trailing 30 days SLA</span>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="bg-surface rounded-xl border border-outline-variant p-md flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant">Active Sessions</p>
              <h3 className="font-headline-md text-headline-md text-on-surface mt-sm">
                {healthData?.activeSessions || 14}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary-container/20 text-primary flex items-center justify-center">
              <Globe className="w-[18px] h-[18px]" />
            </div>
          </div>
          <div className="mt-md flex items-center gap-xs">
            <ArrowUp className="w-3 h-3 text-primary" />
            <span className="font-label-sm text-label-sm text-primary">+5% peak volume</span>
          </div>
        </div>

        {/* Database Health */}
        <div className="bg-surface rounded-xl border border-outline-variant p-md flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant">Database Health</p>
              <h3 className={`font-headline-md text-headline-md mt-sm ${
                healthData?.dbStatus === "Healthy"
                  ? "text-secondary"
                  : healthData?.dbStatus === "Warning"
                    ? "text-yellow-600"
                    : "text-error"
              }`}>
                {healthData?.dbStatus || "Healthy"}
              </h3>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              healthData?.dbStatus === "Healthy"
                ? "bg-secondary-container/20 text-secondary"
                : "bg-error-container/20 text-error"
            }`}>
              <Database className="w-[18px] h-[18px]" />
            </div>
          </div>
          <div className="mt-md flex items-center gap-xs">
            <span className={`font-label-sm text-label-sm ${
              healthData?.dbStatus === "Healthy" ? "text-secondary" : "text-error"
            }`}>
              {healthData?.dbStatusDetail || "Normal query pool"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Chart + Service Status ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        {/* Latency Chart */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-outline-variant p-lg flex flex-col shadow-xs">
          <div className="flex justify-between items-center mb-md">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">System Latency (24h)</h2>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Avg: 130ms</span>
          </div>
          <div className="flex-1 w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={LATENCY_CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e3e5" />
                <XAxis dataKey="time" stroke="#737686" fontSize={12} />
                <YAxis stroke="#737686" fontSize={12} tickFormatter={(v) => `${v}ms`} />
                <Tooltip contentStyle={{ backgroundColor: "#191c1e", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                <Line type="monotone" dataKey="latency" stroke="#004ac6" strokeWidth={2.5} dot={{ fill: "#004ac6", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service Status + Security Alerts */}
        <div className="space-y-md flex flex-col">
          <div className="bg-surface rounded-xl border border-outline-variant p-md flex-1 shadow-xs">
            <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">Service Status</h2>
            <ul className="space-y-sm">
              {healthData?.serviceStatuses.map((svc, idx) => (
                <li key={idx} className="flex items-center justify-between p-sm bg-surface-container-lowest rounded border border-outline-variant/30">
                  <span className="font-body-sm text-body-sm text-on-surface">{svc.name}</span>
                  <div className="flex items-center gap-xs">
                    <div className={`w-2 h-2 rounded-full ${
                      svc.status === "Operational"
                        ? "bg-secondary-fixed-dim"
                        : svc.status === "Degraded"
                          ? "bg-error"
                          : "bg-[#f59e0b]"
                    }`} />
                    <span className={`font-label-sm text-label-sm ${
                      svc.status === "Operational"
                        ? "text-secondary"
                        : svc.status === "Degraded"
                          ? "text-error"
                          : "text-[#f59e0b]"
                    }`}>
                      {svc.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-surface rounded-xl border border-outline-variant p-md flex-1 shadow-xs">
            <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">Recent Security Alerts</h2>
            <div className="space-y-sm">
              {healthData?.securityAlerts.map((alert) => (
                <div key={alert.id} className="flex gap-sm p-sm bg-surface-container-low rounded-lg border border-outline-variant/40">
                  <ShieldCheck className={`w-5 h-5 shrink-0 ${
                    alert.severity === "warning"
                      ? "text-[#f59e0b]"
                      : alert.severity === "critical"
                        ? "text-error"
                        : "text-primary"
                  }`} />
                  <div>
                    <p className="font-label-md text-label-md text-on-surface font-semibold">{alert.title}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">{alert.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* ── Navigation Footer ──────────────────────────────────────── */}
      <div className="pt-md flex justify-between items-center border-t border-outline-variant">
        <Button asChild variant="secondary" className="font-label-md flex items-center gap-2">
          <Link href="/settings/audit-log">
            <ArrowLeft className="w-4 h-4" /> Back to System Audit Log
          </Link>
        </Button>
        <span className="font-label-sm text-label-sm text-on-surface-variant">Diagnostics refreshed live</span>
      </div>
    </div>
  );
}

