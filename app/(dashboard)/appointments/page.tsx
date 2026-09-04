"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormState } from "react-dom";
import {
  format,
  addDays,
  startOfMonth,
  addMonths,
  subMonths,
  getDay,
  isSameDay,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Check,
  List,
  X,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DataPagination from "@/components/ui/data-pagination";
import { createClient } from "@/lib/supabase/client";
import { bookAppointmentAction, type AppointmentFormState } from "./actions";

type AppointmentType = "Consultation" | "Procedure" | "Follow-up";
type ViewMode = "monthly" | "weekly" | "daily" | "list";

interface AppointmentItem {
  id: string;
  patient_name: string;
  doctor_name: string;
  type: AppointmentType;
  time: string;
  room: string;
  date_day: number;
  date: string;
  status: string;
}

const TYPE_STYLES: Record<AppointmentType, string> = {
  Consultation:
    "bg-primary-container/20 text-primary border-l-2 border-primary hover:bg-primary-container/30",
  Procedure:
    "bg-secondary-container/30 text-secondary border-l-2 border-secondary hover:bg-secondary-container/40",
  "Follow-up":
    "bg-tertiary-container/20 text-on-tertiary-container border-l-2 border-tertiary hover:bg-tertiary-container/30",
};

const LEGEND_DOTS: Record<AppointmentType, string> = {
  Consultation: "bg-primary border border-primary-fixed-dim",
  Procedure: "bg-secondary border border-secondary-fixed-dim",
  "Follow-up": "bg-tertiary border border-tertiary-fixed-dim",
};

const STATUS_STYLES: Record<string, string> = {
  scheduled:
    "bg-surface-container-high text-on-surface-variant border border-outline-variant",
  confirmed:
    "bg-primary-container/20 text-primary border border-primary-container/50",
  completed:
    "bg-secondary-container/30 text-secondary border border-secondary-container/50",
  cancelled:
    "bg-error-container/40 text-on-error-container border border-error-container",
  no_show:
    "bg-tertiary-container/20 text-on-tertiary-container border border-tertiary-container/50",
};

const MOCK_APPOINTMENTS: AppointmentItem[] = [
  { id: "mock-1", patient_name: "Sarah Jenkins", doctor_name: "Dr. Rajesh Sharma", type: "Consultation", time: "09:00", room: "Room 302", date_day: 2, date: "2026-10-02", status: "confirmed" },
  { id: "mock-2", patient_name: "Naveen Venkat", doctor_name: "Dr. Vikramaditya Verma", type: "Procedure", time: "11:30", room: "OR 1", date_day: 2, date: "2026-10-02", status: "scheduled" },
  { id: "mock-3", patient_name: "Urbajit Roy", doctor_name: "Dr. Meera Nambiar", type: "Follow-up", time: "10:00", room: "Room 305", date_day: 3, date: "2026-10-03", status: "completed" },
  { id: "mock-4", patient_name: "Ragul Arumugam", doctor_name: "Dr. Rajesh Sharma", type: "Consultation", time: "08:30", room: "Room 302", date_day: 4, date: "2026-10-04", status: "cancelled" },
  { id: "mock-5", patient_name: "Pooja Iyer", doctor_name: "Dr. Ananya Deshmukh", type: "Procedure", time: "13:00", room: "OR 1", date_day: 4, date: "2026-10-04", status: "confirmed" },
  { id: "mock-6", patient_name: "Amitabh Sengupta", doctor_name: "Dr. Vikramaditya Verma", type: "Follow-up", time: "15:45", room: "Room 305", date_day: 4, date: "2026-10-04", status: "no_show" },
];

const BOOKING_TYPES = ["Consultation", "Follow-up", "Routine Checkup", "Specialist Visit"];
const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00",
];

function displayTime(t: string): string {
  if (!t) return "—";
  const [hRaw, mRaw] = t.split(":").map(Number);
  if (!Number.isFinite(hRaw) || !Number.isFinite(mRaw)) return t;
  const suffix = hRaw >= 12 ? "PM" : "AM";
  const hour = hRaw % 12 === 0 ? 12 : hRaw % 12;
  return `${hour}:${String(mRaw).padStart(2, "0")} ${suffix}`;
}

function statusLabel(raw: string): string {
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const initialFormState: AppointmentFormState = { error: null };

export default function AppointmentsCalendarPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = useCallback(() => createClient(), []);

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [appointments, setAppointments] = useState<AppointmentItem[]>(MOCK_APPOINTMENTS);
  const [loading, setLoading] = useState(true);
  const [listPage, setListPage] = useState(1);
  const LIST_PAGE_SIZE = 5;

  /* ---- Book modal state ---- */
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedType, setSelectedType] = useState("Consultation");
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("09:30");
  const [visitNotes, setVisitNotes] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [patients, setPatients] = useState<{ id: string; full_name: string }[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; full_name: string; specialty: string | null }[]>([]);
  const [formState, formAction] = useFormState(bookAppointmentAction, initialFormState);

  const bookParam = searchParams.get("book");
  const patientIdParam = searchParams.get("patientId");
  const doctorIdParam = searchParams.get("doctorId");

  /* ---- Auto-open modal when navigated with ?book=true ---- */
  useEffect(() => {
    if (bookParam === "true") {
      if (patientIdParam) setSelectedPatient(patientIdParam);
      if (doctorIdParam) setSelectedDoctor(doctorIdParam);
      setIsBookModalOpen(true);
    }
  }, [bookParam, patientIdParam, doctorIdParam]);

  const closeBookModal = () => {
    setIsBookModalOpen(false);
    router.replace("/appointments");
  };

  /* ---- Reset list pagination whenever the list view filters change ---- */
  useEffect(() => {
    setListPage(1);
  }, [searchQuery, statusFilter]);
/* ---- Load live appointments + booking options ---- */
  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      const client = supabase();
      try {
        const startISO = new Date(Date.now() - 30 * 86400000).toISOString();
        const endISO = new Date(Date.now() + 90 * 86400000).toISOString();
        const { data, error } = await client
          .from("appointments")
          .select("id, start_time, reason, status, patients(full_name), profiles!appointments_doctor_id_fkey(full_name)")
          .gte("start_time", startISO)
          .lte("start_time", endISO)
          .order("start_time", { ascending: true });

        if (active && data && data.length > 0 && !error) {
          const mapped: AppointmentItem[] = (data as any[]).map((item, idx) => {
            const st = new Date(item.start_time || new Date());
            const reason: string = item.reason || "";
            const type: AppointmentType = reason.startsWith("Follow")
              ? "Follow-up"
              : reason.toLowerCase().includes("procedure") || idx % 3 === 1
                ? "Procedure"
                : "Consultation";
            return {
              id: item.id || `apt-${idx}`,
              patient_name: item.patients?.full_name || "Patient",
              doctor_name: item.profiles?.full_name || "Attending Physician",
              type,
              time: format(st, "HH:mm"),
              room: `Room ${300 + (idx % 5)}`,
              date_day: st.getDate(),
              date: format(st, "yyyy-MM-dd"),
              status: item.status ?? "scheduled",
            };
          });
          setAppointments(mapped);
        } else if (active && error) {
          setAppointments(MOCK_APPOINTMENTS);
        }
      } catch {
        if (active) setAppointments(MOCK_APPOINTMENTS);
      } finally {
        if (active) setLoading(false);
      }
    }

    async function loadOptions() {
      const client = supabase();
      const [patRes, docRes] = await Promise.all([
        client.from("patients").select("id, full_name").order("full_name"),
        client.from("profiles").select("id, full_name, specialty").eq("role", "doctor").order("full_name"),
      ]);
      if (patRes.data) setPatients(patRes.data as { id: string; full_name: string }[]);
      if (docRes.data) {
        setDoctors(docRes.data as { id: string; full_name: string; specialty: string | null }[]);
        if (!selectedDoctor && docRes.data.length > 0) {
          setSelectedDoctor((docRes.data[0] as { id: string }).id);
        }
      }
    }

    loadData();
    loadOptions();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Derived calendar data ---- */
  const currentMonth = startOfMonth(currentDate);
  const dayOffset = getDay(currentMonth);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthDays: (number | null)[] = [
    ...Array.from({ length: dayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const weekStart = addDays(currentDate, -getDay(currentDate));
  const weekDaysArr = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const filteredAppointments = appointments.filter((a) =>
    statusFilter === "all" ? true : a.status === statusFilter
  );
  const searchedAppointments = filteredAppointments.filter((a) => {
    const q = searchQuery.trim().toLowerCase();
    return (
      !q ||
      a.patient_name.toLowerCase().includes(q) ||
      a.doctor_name.toLowerCase().includes(q) ||
      a.type.toLowerCase().includes(q)
    );
  });
  const appointmentsForDate = (day: number) =>
    searchedAppointments.filter((a) => a.date_day === day);
  const appointmentsForDayArray = (date: Date) =>
    searchedAppointments.filter((a) => a.date === format(date, "yyyy-MM-dd"));
  const todaySchedule = appointments
    .filter((a) => a.date === format(new Date(), "yyyy-MM-dd"))
    .sort((a, b) => a.time.localeCompare(b.time));

  const handleConfirmBooking = () => {
    setBookingSuccess(true);
router.replace("/appointments");
    setTimeout(() => setBookingSuccess(false), 3000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] gap-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Appointments</h1>
          <p className="text-body-sm text-on-surface-variant mt-xs">
            Manage schedules and patient bookings.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-md">
          <div className="flex items-center bg-surface-container-low border border-outline-variant rounded-lg p-xs">
            {(["monthly", "weekly", "daily", "list"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-sm py-xs text-label-sm font-semibold rounded-md capitalize transition ${
                  viewMode === mode
                    ? "bg-surface-container-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {mode === "list" ? <List className="w-3.5 h-3.5 inline mr-1" /> : null}
                {mode}
              </button>
            ))}
          </div>
          {viewMode !== "list" && (
            <div className="flex items-center gap-xs bg-surface-container-lowest border border-outline-variant rounded-lg px-sm h-9">
              <button
                type="button"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-xs text-on-surface-variant hover:text-on-surface"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-label-md font-semibold text-on-surface px-sm min-w-[130px] text-center">
                {format(currentDate, "MMMM yyyy")}
              </span>
              <button
                type="button"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-xs text-on-surface-variant hover:text-on-surface"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          <Button
            onClick={() => setIsBookModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-on-primary text-label-md h-9 px-md rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Book Appointment
          </Button>
        </div>
      </div>

      {/* Toolbar: status filter + search */}
      <div className="flex flex-wrap items-center gap-md shrink-0">
        <div className="flex items-center gap-sm bg-surface-container-low border border-outline-variant rounded-lg p-xs">
          {["all", "scheduled", "confirmed", "completed", "cancelled", "no_show"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-sm py-xs text-label-sm font-semibold rounded-md capitalize transition ${
                statusFilter === s
                  ? "bg-surface-container-lowest text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
        {viewMode === "list" && (
          <div className="flex-1 min-w-[220px] max-w-md">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, doctor, or type…"
              className="w-full h-9 px-sm bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>
        )}
        <span className="text-label-sm text-on-surface-variant ml-auto">
          {searchedAppointments.length} appointment{searchedAppointments.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 gap-4">
<div className="flex-1 min-h-0 flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-body-sm text-on-surface-variant">
              Loading schedule…
            </div>
          ) : viewMode === "monthly" ? (
            <div className="grid grid-cols-7 gap-px bg-outline-variant/60 flex-1 min-h-0 grid-rows-6 overflow-y-auto">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="bg-surface-container-lowest p-xs text-label-sm text-on-surface-variant font-semibold text-center">
                  {d}
                </div>
              ))}
              {monthDays.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="bg-surface-container-lowest/40" />;
                }
                const dayApts = appointmentsForDate(day);
                const isToday = isSameDay(
                  new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
                  new Date()
                );
                return (
                  <div
                    key={idx}
                    className={`bg-surface-container-lowest p-xs overflow-y-auto ${isToday ? "ring-1 ring-inset ring-primary" : ""}`}
                  >
                    <span className={`text-label-md font-bold ${isToday ? "text-primary" : "text-on-surface"}`}>
                      {day}
                    </span>
                    <div className="space-y-xs mt-xs">
                      {dayApts.map((apt) => (
                        <Link
                          key={apt.id}
                          href={`/appointments/${apt.id}`}
                          className={`block px-xs py-[2px] rounded text-label-sm font-semibold truncate hover:opacity-90 border-l-2 ${TYPE_STYLES[apt.type]}`}
                          title={`${apt.time} - ${apt.patient_name}`}
                        >
                          {apt.time} {apt.patient_name}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : viewMode === "weekly" ? (
            <div className="grid grid-cols-7 gap-px bg-outline-variant/60 flex-1 min-h-0 overflow-y-auto">
              {weekDaysArr.map((d, idx) => {
                const dayApts = appointmentsForDayArray(d);
                const isToday = isSameDay(d, new Date());
                return (
                  <div
                    key={idx}
                    className={`bg-surface-container-lowest p-sm min-h-[95px] flex flex-col gap-xs ${isToday ? "ring-1 ring-inset ring-primary" : ""}`}
                  >
                    <div className="flex flex-col">
                      <span className="text-label-sm text-on-surface-variant uppercase">{format(d, "EEE")}</span>
                      <span className={`text-label-md font-bold ${isToday ? "text-primary" : "text-on-surface"}`}>
                        {format(d, "d")}
                      </span>
                    </div>
                    <div className="space-y-xs overflow-y-auto">
                      {dayApts.map((apt) => (
                        <Link
                          key={apt.id}
                          href={`/appointments/${apt.id}`}
                          className={`block px-xs py-[2px] rounded text-label-sm font-semibold truncate hover:opacity-90 border-l-2 ${TYPE_STYLES[apt.type]}`}
                          title={`${apt.time} - ${apt.patient_name}`}
                        >
                          {apt.time} {apt.patient_name}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : viewMode === "daily" ? (
<div className="p-lg overflow-y-auto">
              <div className="flex items-center justify-between mb-md">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  {format(currentDate, "EEEE, MMMM d, yyyy")}
                </h3>
                <span className="text-label-sm text-on-surface-variant font-medium">
                  {appointmentsForDayArray(currentDate).length} appointment{appointmentsForDayArray(currentDate).length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-sm">
                {appointmentsForDayArray(currentDate)
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((apt) => (
                    <Link
                      key={apt.id}
                      href={`/appointments/${apt.id}`}
                      className="flex items-center gap-md p-md rounded-lg border border-outline-variant hover:bg-surface-container-low transition"
                    >
                      <span className="text-label-md font-bold text-on-surface-variant w-14 tabular-nums">
                        {displayTime(apt.time)}
                      </span>
                      <span className={`px-sm py-[2px] rounded text-label-sm font-semibold border-l-2 ${TYPE_STYLES[apt.type]}`}>
                        {apt.type}
                      </span>
                      <span className="text-label-md font-semibold text-on-surface flex-1">{apt.patient_name}</span>
                      <span className="text-label-sm text-on-surface-variant hidden md:inline">{apt.room}</span>
                    </Link>
                  ))}
                {appointmentsForDayArray(currentDate).length === 0 && (
                  <div className="text-center py-xl text-on-surface-variant text-body-sm">
                    <CalendarIcon className="w-6 h-6 mx-auto mb-sm text-outline" />
                    No appointments scheduled for this day.
                  </div>
                )}
              </div>
            </div>
          ) : (
<div className="overflow-auto">
              <table className="w-full text-left border-collapse min-w-[720px]">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant text-label-sm text-on-surface-variant uppercase tracking-wider">
                    <th className="p-md font-semibold">Time</th>
                    <th className="p-md font-semibold">Patient</th>
                    <th className="p-md font-semibold">Doctor</th>
                    <th className="p-md font-semibold">Type</th>
                    <th className="p-md font-semibold hidden lg:table-cell">Location</th>
                    <th className="p-md font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="text-body-sm text-on-surface divide-y divide-outline-variant/60">
                  {searchedAppointments
                    .slice((listPage - 1) * LIST_PAGE_SIZE, listPage * LIST_PAGE_SIZE)
                    .map((apt) => (
                    <tr key={apt.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-md font-medium tabular-nums text-on-surface-variant">
                        {format(new Date(apt.date + "T" + apt.time), "MMM d, h:mm a")}
                      </td>
                      <td className="p-md">
                        <Link href={`/appointments/${apt.id}`} className="font-semibold text-on-surface hover:text-primary">
                          {apt.patient_name}
                        </Link>
                      </td>
                      <td className="p-md text-on-surface-variant">{apt.doctor_name}</td>
                      <td className="p-md">
                        <span className={`inline-flex px-sm py-[2px] rounded text-label-sm font-semibold ${TYPE_STYLES[apt.type]}`}>
                          {apt.type}
                        </span>
                      </td>
                      <td className="p-md text-on-surface-variant hidden lg:table-cell">{apt.room}</td>
                      <td className="p-md">
                        <span className={`inline-flex px-sm py-[2px] rounded-full text-label-sm font-semibold capitalize ${STATUS_STYLES[apt.status] ?? STATUS_STYLES.scheduled}`}>
                          {statusLabel(apt.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {searchedAppointments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-xl text-center text-body-sm text-on-surface-variant">
                        <Stethoscope className="w-5 h-5 mx-auto mb-sm text-outline" />
                        No appointments matched your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {viewMode === "list" && searchedAppointments.length > LIST_PAGE_SIZE && (
                <DataPagination
                  totalItems={searchedAppointments.length}
                  currentPage={listPage}
                  onPageChange={setListPage}
                  pageSize={LIST_PAGE_SIZE}
                  itemName="appointments"
                />
              )}
            </div>
          )}
        </div>
{/* Today's Schedule Sidebar */}
        <aside className="w-72 xl:w-80 flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden shrink-0">
          <div className="p-md border-b border-outline-variant bg-surface-container-low">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Today&apos;s Schedule</h3>
            <p className="text-label-sm text-on-surface-variant font-medium">
              {format(new Date(), "EEEE, MMM d, yyyy")}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-md space-y-md">
            {todaySchedule.length > 0 ? (
              todaySchedule.map((apt) => (
                <div key={apt.id} className="flex gap-sm">
                  <span className="text-label-sm font-bold text-on-surface-variant w-12 text-right shrink-0 pt-1 tabular-nums">
                    {displayTime(apt.time)}
                  </span>
                  <div
                    className={`flex-1 bg-surface-container-low border-l-4 rounded-md p-sm ${
                      apt.type === "Consultation"
                        ? "border-primary"
                        : apt.type === "Procedure"
                          ? "border-secondary"
                          : "border-tertiary"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-xs">
                      <Link href={`/appointments/${apt.id}`} className="text-label-md font-bold text-on-surface hover:underline">
                        {apt.patient_name}
                      </Link>
                      <MoreHorizontal className="w-3.5 h-3.5 text-outline" />
                    </div>
                    <p className="text-label-sm text-on-surface-variant mb-xs">{apt.type}</p>
                    <div className="flex items-center gap-xs text-label-sm font-semibold">
                      <span className="px-sm py-[2px] rounded bg-primary-container/20 text-primary">{apt.doctor_name}</span>
                      <span className="px-sm py-[2px] rounded bg-surface-container-high text-on-surface-variant">{apt.room}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-on-surface-variant text-body-sm py-lg">
                No appointments scheduled for today.
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Booking success toast */}
      {bookingSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-xs bg-secondary text-on-secondary text-label-md font-semibold px-md py-sm rounded-lg shadow-level-3">
          <Check className="w-4 h-4" /> Appointment booked successfully!
        </div>
      )}

      {/* Booking error from server action */}
      {formState?.error && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg bg-error-container text-on-error-container text-body-sm px-md py-sm shadow-level-3">
          {formState.error}
        </div>
      )}
{/* BOOK APPOINTMENT MODAL */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-surface-container-lowest rounded-xl shadow-level-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-lg border-b border-outline-variant">
              <h3 className="font-headline-md text-headline-md text-on-surface">Book Appointment</h3>
              <button
                type="button"
                onClick={closeBookModal}
                className="p-sm rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form action={formAction} className="p-lg space-y-lg">
              {formState?.error && (
                <div className="rounded-lg bg-error-container text-on-error-container text-body-sm px-md py-sm">
                  {formState.error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <label className="block">
                  <span className="block font-label-md text-label-md text-on-surface mb-xs">Patient</span>
                  <select
                    name="patientId"
                    required
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="w-full h-10 px-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface focus:border-primary outline-none"
                  >
                    <option value="" disabled>Select patient…</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block font-label-md text-label-md text-on-surface mb-xs">Doctor</span>
                  <select
                    name="doctorId"
                    required
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                    className="w-full h-10 px-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface focus:border-primary outline-none"
                  >
                    <option value="" disabled>Select doctor…</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name}{d.specialty ? ` · ${d.specialty}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
<label className="block">
                  <span className="block font-label-md text-label-md text-on-surface mb-xs">Date</span>
                  <input
                    type="date"
                    name="date"
                    required
                    value={selectedDate}
                    min={format(new Date(), "yyyy-MM-dd")}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full h-10 px-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface focus:border-primary outline-none"
                  />
                </label>

                <label className="block">
                  <span className="block font-label-md text-label-md text-on-surface mb-xs">Time</span>
                  <select
                    name="time"
                    value={selectedTimeSlot}
                    onChange={(e) => setSelectedTimeSlot(e.target.value)}
                    className="w-full h-10 px-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface focus:border-primary outline-none"
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>{displayTime(slot)}</option>
                    ))}
                  </select>
                  <input type="hidden" name="duration" value="30" />
                </label>

                <label className="block md:col-span-2">
                  <span className="block font-label-md text-label-md text-on-surface mb-xs">Reason for Visit / Type</span>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full h-10 px-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface focus:border-primary outline-none"
                  >
                    {BOOKING_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <input type="hidden" name="reason" value={selectedType} />
                </label>

                <label className="block md:col-span-2">
                  <span className="block font-label-md text-label-md text-on-surface mb-xs">Notes (Optional)</span>
                  <textarea
                    name="notes"
                    rows={2}
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                    placeholder="Briefly describe symptoms or purpose of visit…"
                    className="w-full p-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface focus:border-primary outline-none"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-md pt-md border-t border-outline-variant">
                <Button type="button" variant="secondary" size="sm" onClick={closeBookModal}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-on-primary font-semibold">
                  Confirm Booking
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
