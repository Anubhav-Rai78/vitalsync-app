"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Users, Activity, TrendingUp, DollarSign, Clock } from "lucide-react";

const patientVolumeData = [
  { day: "Mon", patients: 45, averageWaitTime: 12 },
  { day: "Tue", patients: 52, averageWaitTime: 15 },
  { day: "Wed", patients: 61, averageWaitTime: 18 },
  { day: "Thu", patients: 48, averageWaitTime: 10 },
  { day: "Fri", patients: 70, averageWaitTime: 22 },
  { day: "Sat", patients: 38, averageWaitTime: 8 },
];

const peakHoursHeatmap = [
  { hour: "08:00", volume: "Low" },
  { hour: "10:00", volume: "High" },
  { hour: "12:00", volume: "Medium" },
  { hour: "14:00", volume: "High" },
  { hour: "16:00", volume: "Medium" },
  { hour: "18:00", volume: "Low" },
];

export default function AnalyticsReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-md font-display text-on-surface">Clinical Analytics & Insights</h1>
        <p className="text-body-sm text-on-surface-variant">
          Comprehensive hospital performance, queue latency, and department utilization
        </p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-level-2">
          <h3 className="font-display font-semibold text-on-surface mb-4">Patient Volume Throughput</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patientVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e3e5" />
                <XAxis dataKey="day" stroke="#737686" />
                <YAxis stroke="#737686" />
                <Tooltip />
                <Bar dataKey="patients" fill="#004ac6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-level-2">
          <h3 className="font-display font-semibold text-on-surface mb-4">Peak Arrival Hours Heatmap</h3>
          <div className="grid grid-cols-3 gap-3">
            {peakHoursHeatmap.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border text-center ${
                  item.volume === "High"
                    ? "bg-primary-container/20 border-primary text-primary font-bold animate-pulse"
                    : item.volume === "Medium"
                    ? "bg-secondary-container/20 border-secondary text-secondary font-semibold"
                    : "bg-surface-container border-outline-variant text-on-surface-variant"
                }`}
              >
                <div className="text-sm">{item.hour}</div>
                <div className="text-xs mt-1 uppercase tracking-wider">{item.volume} Load</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
