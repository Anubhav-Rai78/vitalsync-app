"use client";

import React from "react";
import { format } from "date-fns";
import { Calendar, Users, CalendarCheck, Clock, Plus, ArrowRight, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const activityData = [
  { day: "Mon", Consultations: 45, Procedures: 20 },
  { day: "Tue", Consultations: 52, Procedures: 24 },
  { day: "Wed", Consultations: 61, Procedures: 28 },
  { day: "Thu", Consultations: 48, Procedures: 18 },
  { day: "Fri", Consultations: 70, Procedures: 35 },
  { day: "Sat", Consultations: 38, Procedures: 15 },
  { day: "Sun", Consultations: 20, Procedures: 10 },
];

export default function AdminDashboardPage() {
  const currentDateFormatted = format(new Date(), "EEEE, MMMM d, yyyy");

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* Header with Expanded Date Format */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Welcome back, Dr. Sarah Jenkins
          </h1>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {currentDateFormatted}
          </p>
        </div>

        <Button asChild className="bg-[#2563eb] hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-sm">
          <Link href="/appointments?book=true" className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Book Appointment
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold text-slate-600">Total Patients</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2563eb] flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">1,284</div>
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
              ↑ +12% this month
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold text-slate-600">Today's Appointments</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <CalendarCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">42</div>
            <span className="text-[11px] font-medium text-slate-500 mt-0.5 block">8 remaining today</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold text-slate-600">Pending Labs</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">15</div>
            <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-0.5">
              ▲ 3 critical
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold text-slate-600">Monthly Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">$48,500</div>
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
              ↑ +5% this month
            </span>
          </div>
        </div>
      </div>

      {/* Main Split: Recent Patients & Upcoming Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Recent Patients</h3>
            <Link href="/patients" className="text-xs font-semibold text-[#2563eb] hover:underline">
              View All
            </Link>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase font-bold text-slate-400 border-b border-slate-100">
              <tr>
                <th className="pb-3">Patient Name</th>
                <th className="pb-3">Visit Type</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { name: "Robert Evans", type: "Cardiology Follow-up", status: "Completed", statusStyle: "bg-emerald-50 text-emerald-700", time: "09:00 AM" },
                { name: "Maria Garcia", type: "General Checkup", status: "In Progress", statusStyle: "bg-blue-50 text-[#2563eb]", time: "10:15 AM" },
                { name: "James Wilson", type: "Lab Results Review", status: "Waiting", statusStyle: "bg-amber-50 text-amber-700", time: "11:00 AM" },
                { name: "Emma Larson", type: "Orthopedics Consult", status: "Waiting", statusStyle: "bg-amber-50 text-amber-700", time: "11:30 AM" },
              ].map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-3 font-semibold text-slate-800 flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    {p.name}
                  </td>
                  <td className="py-3 text-slate-600">{p.type}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.statusStyle}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 text-right font-medium text-slate-500">{p.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-4">Upcoming Schedule</h3>

            <div className="space-y-3">
              {[
                { time: "1:00 PM", patient: "Michael Chen", doctor: "Dr. Sarah Jenkins", active: true },
                { time: "2:15 PM", patient: "Sarah Connor", doctor: "Dr. Alan Grant", active: false },
                { time: "3:30 PM", patient: "David Bowman", doctor: "Dr. Sarah Jenkins", active: false },
              ].map((slot, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${slot.active ? "bg-[#2563eb]" : "bg-slate-300"}`} />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">{slot.time}</span>
                    <span className="text-slate-700 font-medium">{slot.patient}</span>
                    <span className="text-[11px] text-slate-400 block">🩺 {slot.doctor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button variant="secondary" size="sm" asChild className="w-full mt-4 text-xs font-semibold">
            <Link href="/appointments">View Full Schedule</Link>
          </Button>
        </div>
      </div>

      {/* Clinic Activity Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900">Clinic Activity (Last 7 Days)</h3>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-200" /> Consultations
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#2563eb]" /> Procedures
            </span>
          </div>
        </div>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip />
              <Bar dataKey="Consultations" fill="#bfdbfe" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Procedures" fill="#2563eb" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}