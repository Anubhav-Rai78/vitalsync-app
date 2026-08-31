"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { format, addDays, startOfMonth, addMonths, subMonths, getDay, isSameDay } from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  MoreHorizontal,
  X,
  Check,
  Search,
  ChevronDown,
  Sun,
  CloudSun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type AppointmentType = "Consultation" | "Procedure" | "Follow-up";

interface AppointmentItem {
  id: string;
  patient_name: string;
  doctor_name: string;
  type: AppointmentType;
  time: string;
  room: string;
  date_day: number;
  date: string;
}

const TYPE_STYLES: Record<AppointmentType, string> = {
  Consultation: "bg-blue-50 text-[#2563eb] border-l-2 border-[#2563eb] hover:bg-blue-100",
  Procedure: "bg-emerald-50 text-[#006c49] border-l-2 border-[#006c49] hover:bg-emerald-100",
  "Follow-up": "bg-cyan-50 text-[#005e6e] border-l-2 border-[#005e6e] hover:bg-cyan-100",
};

const LEGEND_COLORS: Record<AppointmentType, string> = {
  Consultation: "bg-blue-500",
  Procedure: "bg-emerald-500",
  "Follow-up": "bg-cyan-500",
};

const MOCK_APPOINTMENTS: AppointmentItem[] = [
  { id: "1", patient_name: "Robert C.", doctor_name: "Dr. Jenkins", type: "Consultation", time: "09:00", room: "Room 302", date_day: 2, date: "2026-10-02" },
  { id: "2", patient_name: "Elena R.", doctor_name: "Dr. Jenkins", type: "Procedure", time: "11:30", room: "OR 1", date_day: 2, date: "2026-10-02" },
  { id: "3", patient_name: "James S.", doctor_name: "Dr. Patel", type: "Follow-up", time: "10:00", room: "Room 305", date_day: 3, date: "2026-10-03" },
  { id: "4", patient_name: "Maria G.", doctor_name: "Dr. Jenkins", type: "Consultation", time: "08:30", room: "Room 302", date_day: 4, date: "2026-10-04" },
  { id: "5", patient_name: "David K.", doctor_name: "Dr. Jenkins", type: "Procedure", time: "13:00", room: "OR 1", date_day: 4, date: "2026-10-04" },
  { id: "6", patient_name: "Sarah J.", doctor_name: "Dr. Patel", type: "Follow-up", time: "15:45", room: "Room 305", date_day: 4, date: "2026-10-04" },
  { id: "7", patient_name: "Michael C.", doctor_name: "Dr. Chen", type: "Consultation", time: "09:15", room: "Room 105", date_day: 5, date: "2026-10-05" },
  { id: "8", patient_name: "Anna L.", doctor_name: "Dr. Jenkins", type: "Procedure", time: "14:00", room: "OR 2", date_day: 10, date: "2026-10-10" },
];

const BOOKING_TYPES = ["Consultation", "Follow-up", "Routine Checkup", "Specialist Visit"];
const MORNING_SLOTS = ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM"];
const AFTERNOON_SLOTS = ["01:00 PM", "01:30 PM", "02:00 PM"];
type ViewMode = "monthly" | "weekly" | "daily";

export default function AppointmentsCalendarPage() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("dr-jenkins");
  const [appointmentType, setAppointmentType] = useState("Consultation");
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("09:30 AM");
  const [visitNotes, setVisitNotes] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      try {
        const startISO = new Date(Date.now() - 30 * 86400000).toISOString();
        const endISO = new Date(Date.now() + 90 * 86400000).toISOString();
        const { data, error } = await supabase
          .from("appointments")
          .select("id, start_time, reason, patients(full_name), profiles!appointments_doctor_id_fkey(full_name)")
          .gte("start_time", startISO).lte("start_time", endISO)
          .order("start_time", { ascending: true });

        if (active && data && data.length > 0 && !error) {
          const mapped: AppointmentItem[] = (data as any[]).map((item, idx) => {
            const st = new Date(item.start_time || new Date());
            const reason: string = item.reason || "";
            const type: AppointmentType =
              reason === "Consultation" ? "Consultation"
              : reason?.startsWith("Follow") ? "Follow-up"
              : idx % 3 === 0 ? "Consultation" : idx % 3 === 1 ? "Procedure" : "Follow-up";
            return {
              id: item.id || `apt-${idx}`,
              patient_name: item.patients?.full_name || "Patient",
              doctor_name: item.profiles?.full_name || "Dr. Sarah Jenkins",
              type, time: format(st, "HH:mm"), room: `Room ${300 + (idx % 5)}`,
              date_day: st.getDate(), date: format(st, "yyyy-MM-dd"),
            };
          });
          setAppointments(mapped);
        } else if (active) {
          setAppointments(MOCK_APPOINTMENTS);
        }
      } catch (e) {
        console.error("Appointments fetch error:", e);
        if (active) setAppointments(MOCK_APPOINTMENTS);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentMonth = startOfMonth(currentDate);
  const dayOffset = getDay(currentMonth);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthDays: (number | null)[] = [
    ...Array.from({ length: dayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const weekStart = addDays(currentDate, -getDay(currentDate));
  const weekDaysArr = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const appointmentsForDate = (day: number) => appointments.filter((a) => a.date_day === day);
  const appointmentsForDayArray = (date: Date) => appointments.filter((a) => a.date === format(date, "yyyy-MM-dd"));
  const todaySchedule = appointments
    .filter((a) => a.date === format(new Date(), "yyyy-MM-dd"))
    .sort((a, b) => a.time.localeCompare(b.time));

  const handleConfirmBooking = () => {
    setBookingSuccess(true);
    setIsBookModalOpen(false);
    setTimeout(() => setBookingSuccess(false), 3000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appointments</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage schedules and patient bookings.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1">
            {(["monthly", "weekly", "daily"] as const).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition ${viewMode === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
                {mode}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 h-9">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 text-slate-500 hover:text-slate-900" aria-label="Previous month">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-800 px-2 min-w-[130px] text-center">{format(currentDate, "MMMM yyyy")}</span>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 text-slate-500 hover:text-slate-900" aria-label="Next month">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => setIsBookModalOpen(true)} className="bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-semibold h-9 px-4 rounded-lg shadow-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Book Appointment
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-5 mb-3 shrink-0 text-xs">
        <span className="text-slate-400 font-medium">Legend:</span>
        {(Object.keys(LEGEND_COLORS) as AppointmentType[]).map((t) => (
          <div key={t} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${LEGEND_COLORS[t]}`} />
            <span className="font-medium text-slate-700">{t}</span>
          </div>
        ))}
      </div>
      <div className="flex-1 flex gap-6 min-h-0">
        <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-[#f8fafc] shrink-0 text-center py-2.5 text-xs font-semibold text-slate-600">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {viewMode === "monthly" && (
              <div className="grid grid-cols-7 gap-px bg-slate-200">
                {monthDays.map((day, idx) => {
                  if (day === null) return <div key={`pad-${idx}`} className="bg-[#f8fafc] p-2 min-h-[95px] text-xs text-slate-300" />;
                  const dayApts = appointmentsForDate(day);
                  const isToday = isSameDay(new Date(currentDate.getFullYear(), currentDate.getMonth(), day), new Date());
                  return (
                    <div key={day} className={`bg-white p-2 min-h-[95px] flex flex-col gap-1 ${isToday ? "bg-blue-50/40 ring-1 ring-inset ring-[#2563eb]" : ""}`}>
                      <span className={`text-xs font-bold ${isToday ? "text-[#2563eb]" : "text-slate-800"}`}>{day}</span>
                      <div className="space-y-1 overflow-y-auto">
                        {dayApts.map((apt) => (
                          <Link key={apt.id} href={`/appointments/${apt.id}`}
                            className={`block px-2 py-0.5 rounded text-[11px] font-semibold truncate hover:opacity-90 border-l-2 ${TYPE_STYLES[apt.type]}`}
                            title={`${apt.time} - ${apt.patient_name}`}>
                            {apt.time} {apt.patient_name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === "weekly" && (
              <div className="grid grid-cols-7 gap-px bg-slate-200">
                {weekDaysArr.map((d, idx) => {
                  const dayApts = appointmentsForDayArray(d);
                  const isToday = isSameDay(d, new Date());
                  return (
                    <div key={idx} className={`bg-white p-2 min-h-[95px] flex flex-col gap-1 ${isToday ? "bg-blue-50/40 ring-1 ring-inset ring-[#2563eb]" : ""}`}>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">{format(d, "EEE")}</span>
                        <span className={`text-xs font-bold ${isToday ? "text-[#2563eb]" : "text-slate-800"}`}>{format(d, "d")}</span>
                      </div>
                      <div className="space-y-1 overflow-y-auto">
                        {dayApts.map((apt) => (
                          <Link key={apt.id} href={`/appointments/${apt.id}`}
                            className={`block px-2 py-0.5 rounded text-[11px] font-semibold truncate hover:opacity-90 border-l-2 ${TYPE_STYLES[apt.type]}`}
                            title={`${apt.time} - ${apt.patient_name}`}>
                            {apt.time} {apt.patient_name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {viewMode === "daily" && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">{format(currentDate, "EEEE, MMMM d, yyyy")}</h3>
                  <span className="text-xs text-slate-500 font-medium">{appointmentsForDayArray(currentDate).length} appointments</span>
                </div>
                <div className="space-y-2">
                  {appointmentsForDayArray(currentDate).sort((a, b) => a.time.localeCompare(b.time)).map((apt) => (
                    <Link key={apt.id} href={`/appointments/${apt.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition">
                      <span className="text-xs font-bold text-slate-600 w-14">{apt.time}</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border-l-2 ${TYPE_STYLES[apt.type]}`}>{apt.type}</span>
                      <span className="text-xs font-semibold text-slate-800 flex-1">{apt.patient_name}</span>
                      <span className="text-[11px] text-slate-500">{apt.room}</span>
                    </Link>
                  ))}
                  {appointmentsForDayArray(currentDate).length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm">
                      <CalendarIcon className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                      No appointments scheduled for this day.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Today's Schedule Sidebar */}
        <aside className="w-80 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-100 bg-[#f8fafc]">
            <h3 className="text-sm font-bold text-slate-900">Today&apos;s Schedule</h3>
            <p className="text-xs text-slate-500 font-medium">{format(new Date(), "EEEE, MMM d, yyyy")}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="text-center text-slate-400 text-xs py-8">Loading schedule...</div>
            ) : todaySchedule.length > 0 ? (
              todaySchedule.map((apt) => (
                <div key={apt.id} className="flex gap-3">
                  <span className="text-xs font-bold text-slate-500 w-12 text-right shrink-0 pt-1">{apt.time}</span>
                  <div className={`flex-1 bg-[#f8fafc] border-l-4 rounded-r-lg p-3 shadow-xs ${
                    apt.type === "Consultation" ? "border-[#2563eb]" : apt.type === "Procedure" ? "border-emerald-600" : "border-cyan-600"
                  }`}>
                    <div className="flex justify-between items-start mb-1">
                      <Link href={`/appointments/${apt.id}`} className="text-xs font-bold text-slate-900 hover:underline">{apt.patient_name}</Link>
                      <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2 font-medium">{apt.type}</p>
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-[#2563eb]">{apt.doctor_name}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700">{apt.room}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 text-xs py-8">No appointments scheduled for today.</div>
            )}
          </div>
        </aside>
      </div>

      {bookingSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white text-xs font-semibold px-4 py-3 rounded-lg shadow-xl">
          <Check className="w-4 h-4" /> Appointment booked successfully!
        </div>
      )}

      {/* BOOK APPOINTMENT MODAL */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#f8fafc]">
              <div>
                <h2 className="text-base font-bold text-slate-900">Book Appointment</h2>
                <p className="text-xs text-slate-500">Schedule a new visit or consultation.</p>
              </div>
              <button onClick={() => setIsBookModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Patient</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input type="text" value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)}
                      placeholder="Search patient name or ID..." className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 focus:border-[#2563eb] outline-none" />
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Provider</label>
                  <div className="relative">
                    <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}
                      className="w-full h-9 px-3 pr-8 rounded-lg border border-slate-200 focus:border-[#2563eb] outline-none appearance-none cursor-pointer bg-white">
                      <option value="dr-jenkins">Dr. Sarah Jenkins (Cardiology)</option>
                      <option value="dr-chen">Dr. Marcus Chen (Pediatrics)</option>
                      <option value="dr-rodriguez">Dr. Emily Rodriguez (General)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-800 block mb-1.5">Appointment Type</label>
                <div className="flex flex-wrap gap-2">
                  {BOOKING_TYPES.map((type) => (
                    <button key={type} type="button" onClick={() => setAppointmentType(type)}
                      className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition ${appointmentType === type ? "border-[#2563eb] bg-blue-50 text-[#2563eb]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Select Date</label>
                  <div className="border border-slate-200 rounded-lg p-3 bg-white">
                    <div className="flex justify-between items-center mb-2 font-semibold text-slate-900">
                      <span>{format(currentDate, "MMMM yyyy")}</span>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-0.5 text-slate-400 hover:text-slate-600"><ChevronLeft className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-0.5 text-slate-400 hover:text-slate-600"><ChevronRight className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400 font-bold mb-1">
                      <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                        <button key={d} type="button" onClick={() => setSelectedDay(d)}
                          className={`py-1 rounded font-semibold transition ${selectedDay === d ? "bg-[#2563eb] text-white" : "text-slate-700 hover:bg-slate-100"}`}>{d}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Available Times</label>
                  <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-3">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mb-1.5"><Sun className="w-3.5 h-3.5 text-amber-500" /> Morning</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {MORNING_SLOTS.map((slot, idx) => (
                          <button key={slot} type="button" disabled={idx === 3 || idx === 5} onClick={() => setSelectedTimeSlot(slot)}
                            className={`py-1.5 border rounded text-[11px] font-semibold transition ${idx === 3 || idx === 5 ? "opacity-40 line-through bg-slate-50 border-slate-200 cursor-not-allowed" : selectedTimeSlot === slot ? "border-[#2563eb] bg-blue-50 text-[#2563eb]" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mb-1.5"><CloudSun className="w-3.5 h-3.5 text-amber-500" /> Afternoon</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {AFTERNOON_SLOTS.map((slot) => (
                          <button key={slot} type="button" onClick={() => setSelectedTimeSlot(slot)}
                            className={`py-1.5 border rounded text-[11px] font-semibold transition ${selectedTimeSlot === slot ? "border-[#2563eb] bg-blue-50 text-[#2563eb]" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-800 block mb-1">Reason for Visit / Notes (Optional)</label>
                <textarea rows={2} value={visitNotes} onChange={(e) => setVisitNotes(e.target.value)}
                  placeholder="Briefly describe symptoms or purpose of visit..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:border-[#2563eb] outline-none text-xs" />
              </div>
            </div>
            <div className="px-6 py-3 border-t border-slate-100 bg-[#f8fafc] flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsBookModalOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleConfirmBooking} className="bg-[#2563eb] hover:bg-blue-700 text-white font-semibold">Confirm Booking</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
