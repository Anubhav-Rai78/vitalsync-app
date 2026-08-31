"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Stethoscope,
  MoreVertical,
  X,
  List,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { AppointmentCalendarGrid } from "./calendar-grid";

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-slate-100 text-slate-700 border-slate-200",
  confirmed: "bg-blue-50 text-[#2563eb] border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  no_show: "bg-amber-50 text-amber-700 border-amber-200",
};

interface AppointmentRecord {
  id: string;
  patient_name: string;
  doctor_name: string;
  start_time: string;
  reason: string | null;
  status: string;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");

  const supabase = createClient();

  useEffect(() => {
    async function loadAppointments() {
      setLoading(true);
      try {
        const startDate = new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString();
        const endDate = new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000
        ).toISOString();

        const { data, error } = await supabase
          .from("appointments")
          .select(
            "id, start_time, status, reason, patients(full_name), profiles!appointments_doctor_id_fkey(full_name)"
          )
          .gte("start_time", startDate)
          .lte("start_time", endDate)
          .order("start_time", { ascending: true });

        if (data && !error) {
          const mapped = ((data as any[]) ?? [])
            .filter(
              (a: any) =>
                new Date(a.start_time) >=
                new Date(Date.now() - 24 * 60 * 60 * 1000)
            )
            .slice(0, 50)
            .map((item: any) => ({
              id: item.id,
              patient_name:
                item.patients?.full_name || "Unknown Patient",
              doctor_name:
                item.profiles?.full_name || "Unknown Doctor",
              start_time: item.start_time,
              reason: item.reason,
              status: item.status || "scheduled",
            }));
          setAppointments(mapped);
        }
      } catch (err) {
        console.error("Appointments load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      apt.patient_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      apt.doctor_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Appointments
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage schedules, consultations, and patient visits.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-[#f8fafc] p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                view === "list"
                  ? "bg-white text-[#2563eb] shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                view === "calendar"
                  ? "bg-white text-[#2563eb] shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Calendar
            </button>
          </div>
          <Button
            onClick={() => setIsBookModalOpen(true)}
            className="bg-[#2563eb] hover:bg-blue-700 text-white font-semibold text-xs px-4 h-10 rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Book Appointment
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient or doctor name..."
            className="w-full h-10 pl-10 pr-4 bg-[#f8fafc] border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#2563eb] outline-none"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500">
              Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 px-3 py-1 focus:border-[#2563eb] outline-none"
            >
              <option value="all">All</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {view === "calendar" ? (
        <AppointmentCalendarGrid />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead className="bg-[#f8fafc] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500">
                    Time & Date
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500">
                    Patient
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500">
                    Doctor
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500">
                    Reason
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500">
                    Status
                  </th>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-xs text-slate-400"
                    >
                      Loading appointments schedule...
                    </td>
                  </tr>
                ) : filteredAppointments.length > 0 ? (
                  filteredAppointments.map((apt) => (
                    <tr
                      key={apt.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-6 font-medium text-slate-900">
                        {format(new Date(apt.start_time), "h:mm a")}
                        <span className="block text-[11px] text-slate-400 font-normal">
                          {format(
                            new Date(apt.start_time),
                            "MMM d, yyyy"
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {apt.patient_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-[#2563eb]" /> {apt.doctor_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {apt.reason || "\u2014"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${
                            STATUS_STYLES[apt.status] ||
                            "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {apt.status?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button className="text-slate-400 hover:text-slate-600 p-1">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-xs text-slate-400"
                    >
                      No appointments found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Footer */}
          <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
            <p>
              Showing <span className="font-semibold text-slate-800">1</span> to{" "}
              <span className="font-semibold text-slate-800">
                {filteredAppointments.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-800">
                {appointments.length}
              </span>{" "}
              Appointments
            </p>
            <div className="flex items-center gap-1.5">
              <button
                className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                disabled
              >
                &lt;
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded bg-blue-50 text-[#2563eb] font-semibold border border-blue-200 text-xs">
                1
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs">
                &gt;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Book Appointment Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Book New Appointment
              </h3>
              <button
                onClick={() => setIsBookModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 font-medium block mb-1">
                  Patient Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Urbajit"
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-[#2563eb] outline-none"
                />
              </div>
              <div>
                <label className="text-slate-600 font-medium block mb-1">
                  Doctor
                </label>
                <select className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-[#2563eb] outline-none">
                  <option>Dr. Sarah Jenkins (Cardiology)</option>
                  <option>Dr. Marcus Chen (Pediatrics)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-600 font-medium block mb-1">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-[#2563eb] outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsBookModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-[#2563eb] text-white"
                onClick={() => setIsBookModalOpen(false)}
              >
                Schedule
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
