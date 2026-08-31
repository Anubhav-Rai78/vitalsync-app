"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format, startOfMonth, addMonths, subMonths } from "date-fns";
import {
  ArrowLeft,
  CheckCircle,
  Calendar,
  Clock,
  CalendarCheck,
  Video,
  ArrowRight,
  Stethoscope,
  Heart,
  Activity,
  Thermometer,
  Wind,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/* -------------------------------------------------------------------------- */
/*  Fallback data — prevents 504 / empty-DB UI crashes.                       */
/* -------------------------------------------------------------------------- */
const FALLBACK = {
  id: "APT-8924-VL",
  title: "Cardiology Consultation",
  status: "Checked In",
  date: "Oct 24, 2026",
  time_slot: "10:30 AM - 11:15 AM",
  patient: {
    id: "pt-1",
    name: "Michael Chen",
    gender: "Male",
    age: "42",
    dob: "05/12/1981",
    id_formatted: "PT-88921",
  },
  provider: { name: "Dr. Sarah Jenkins", specialty: "Senior Cardiologist" },
  chief_complaint:
    "Patient reports experiencing mild chest tightness and shortness of breath during moderate exercise over the past two weeks. No history of similar episodes.",
  symptoms: ["Chest Tightness", "Shortness of Breath"],
  vitals: { bp: "128/82", hr: "76", temp: "98.4", spo2: "99%" },
};

interface DetailState {
  id: string;
  title: string;
  status: string;
  date: string;
  time_slot: string;
  patient: {
    id: string;
    name: string;
    gender: string;
    age: string;
    dob: string;
    id_formatted: string;
  };
  provider: { name: string; specialty: string };
  chief_complaint: string;
  symptoms: string[];
  vitals: { bp: string; hr: string; temp: string; spo2: string };
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */
function initials(name: string) {
  return name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const RESCHEDULE_SLOTS = ["09:30 AM", "11:00 AM", "01:30 PM", "03:00 PM", "04:30 PM"];

/* -------------------------------------------------------------------------- */
/*  Page Component                                                             */
/* -------------------------------------------------------------------------- */
export default function AppointmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = (params?.id as string) || "";

  /* ---- Live data state ---- */
  const [detail, setDetail] = useState<DetailState>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  /* ---- Reschedule dialog state ---- */
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(18);
  const [rescheduleMonth, setRescheduleMonth] = useState(() => new Date());
  const [rescheduleTime, setRescheduleTime] = useState("11:00 AM");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  /* ---- Fetch live appointment ---- */
  useEffect(() => {
    if (!appointmentId) {
      setLoading(false);
      return;
    }
    let active = true;
    async function load() {
      try {
        const { data, error } = await supabase
          .from("appointments")
          .select(
            "id, start_time, end_time, reason, status, notes, patients(id, full_name, sex, dob, phone, email), profiles!appointments_doctor_id_fkey(id, full_name, specialty)"
          )
          .eq("id", appointmentId)
          .single();

        if (active && data && !error) {
          const patient: any = data.patients;
          const doctor: any = data.profiles;
          const start = new Date(data.start_time || new Date());
          const end = data.end_time
            ? new Date(data.end_time)
            : new Date(start.getTime() + 45 * 60000);
          const statusLabel = data.status
            ? String(data.status)
                .replace("_", " ")
                .replace(/\b\w/g, (c: string) => c.toUpperCase())
            : "Confirmed";
          const symptomList: string[] = [];
          if (data.reason) symptomList.push(String(data.reason));

          setDetail({
            id: `APT-${String(appointmentId).slice(0, 4).toUpperCase()}`,
            title: data.reason || "Consultation",
            status: statusLabel,
            date: format(start, "MMM d, yyyy"),
            time_slot: `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`,
            patient: {
              id: patient?.id || FALLBACK.patient.id,
              name: patient?.full_name || FALLBACK.patient.name,
              gender: patient?.sex
                ? String(patient.sex).charAt(0).toUpperCase() + String(patient.sex).slice(1)
                : FALLBACK.patient.gender,
              age: patient?.dob
                ? String(
                    Math.floor(
                      (Date.now() - new Date(patient.dob).getTime()) / 31557600000
                    )
                  )
                : FALLBACK.patient.age,
              dob: patient?.dob
                ? format(new Date(patient.dob), "MM/dd/yyyy")
                : FALLBACK.patient.dob,
              id_formatted: patient?.id
                ? `PT-${String(patient.id).slice(0, 5).toUpperCase()}`
                : FALLBACK.patient.id_formatted,
            },
            provider: {
              name: doctor?.full_name
                ? `Dr. ${doctor.full_name}`
                : FALLBACK.provider.name,
              specialty: doctor?.specialty || FALLBACK.provider.specialty,
            },
            chief_complaint: data.notes || data.reason || FALLBACK.chief_complaint,
            symptoms: symptomList.length > 0 ? symptomList : FALLBACK.symptoms,
            vitals: FALLBACK.vitals,
          });
        }
      } catch (e) {
        console.error("Appointment detail fetch error:", e);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [appointmentId, supabase]);

  /* ---- Start Visit handler (prevents event bubbling / form submit) ---- */
  const handleStartVisit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(
      `/prescriptions/new?appointmentId=${encodeURIComponent(
        appointmentId
      )}&patientName=${encodeURIComponent(detail.patient.name)}`
    );
  };

  /* ---- Confirm Reschedule handler ---- */
  const handleConfirmReschedule = () => {
    setIsRescheduling(true);
    setTimeout(() => {
      setDetail((prev) => ({
        ...prev,
        date: format(
          new Date(rescheduleMonth.getFullYear(), rescheduleMonth.getMonth(), rescheduleDate),
          "MMM d, yyyy"
        ),
        time_slot: rescheduleTime,
        status: "Confirmed",
      }));
      setIsRescheduling(false);
      setIsRescheduleOpen(false);
    }, 400);
  };

  /* ---- Dynamic mini-calendar ---- */
  const calMonth = startOfMonth(rescheduleMonth);
  const calDaysInMonth = new Date(
    calMonth.getFullYear(),
    calMonth.getMonth() + 1,
    0
  ).getDate();
  const calStartDow = calMonth.getDay();

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-12">
      {/* ---- Contextual Back Link ---- */}
      <div>
        <Link
          href="/appointments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#004ac6] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Appointments
        </Link>
      </div>

      {/* ---- Main Drawer Container ---- */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-200 bg-[#f7f9fb] flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" /> {detail.status}
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">
                {detail.id}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{detail.title}</h1>
            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> {detail.date}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> {detail.time_slot}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsRescheduleOpen(true)}
              className="text-xs font-semibold hover:bg-slate-50"
            >
              <CalendarCheck className="w-3.5 h-3.5 mr-1.5" /> Reschedule
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleStartVisit}
              className="bg-[#004ac6] hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
            >
              <Video className="w-3.5 h-3.5 mr-1.5" /> Start Visit
            </Button>
          </div>
        </div>

        {/* ---- Main Grid Layout ---- */}
        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Patient & Provider */}
          <div className="lg:col-span-4 space-y-4">
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Patient
                </span>
                <Link
                  href={`/patients/${detail.patient.id}`}
                  className="text-xs font-semibold text-[#004ac6] flex items-center gap-0.5 hover:underline"
                >
                  View Profile <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-50 text-[#004ac6] flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100">
                  {initials(detail.patient.name)}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {detail.patient.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {detail.patient.gender}, {detail.patient.age} yrs &bull; DOB:{" "}
                    {detail.patient.dob}
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                Provider
              </span>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-50 text-[#004ac6] flex items-center justify-center shrink-0 border border-blue-100">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {detail.provider.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {detail.provider.specialty}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Chief Complaint & Vitals */}
          <div className="lg:col-span-8 space-y-6">
            <div className="border border-slate-200 rounded-xl p-5 bg-white">
              <h2 className="text-sm font-bold text-slate-900 mb-2">
                Chief Complaint
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                {detail.chief_complaint}
              </p>
              <div className="flex flex-wrap gap-2">
                {detail.symptoms.map((sym, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200"
                  >
                    {sym}
                  </span>
                ))}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-5 bg-[#f7f9fb]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900">Triage Vitals</h2>
                <span className="text-[11px] text-slate-400 font-medium">
                  Taken 15m ago
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                  <span className="text-slate-500 font-semibold flex items-center gap-1 text-[11px]">
                    <Heart className="w-3.5 h-3.5 text-red-500" /> Blood Pressure
                  </span>
                  <div className="text-lg font-bold text-slate-900 mt-2">
                    {detail.vitals.bp}
                  </div>
                  <span className="text-[10px] text-slate-400">mmHg</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                  <span className="text-slate-500 font-semibold flex items-center gap-1 text-[11px]">
                    <Activity className="w-3.5 h-3.5 text-[#004ac6]" /> Heart Rate
                  </span>
                  <div className="text-lg font-bold text-slate-900 mt-2">
                    {detail.vitals.hr}
                  </div>
                  <span className="text-[10px] text-slate-400">bpm</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                  <span className="text-slate-500 font-semibold flex items-center gap-1 text-[11px]">
                    <Thermometer className="w-3.5 h-3.5 text-emerald-600" /> Temperature
                  </span>
                  <div className="text-lg font-bold text-slate-900 mt-2">
                    {detail.vitals.temp}
                  </div>
                  <span className="text-[10px] text-slate-400">&deg;F</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                  <span className="text-slate-500 font-semibold flex items-center gap-1 text-[11px]">
                    <Wind className="w-3.5 h-3.5 text-cyan-600" /> SpO2
                  </span>
                  <div className="text-lg font-bold text-slate-900 mt-2">
                    {detail.vitals.spo2}
                  </div>
                  <span className="text-[10px] text-slate-400">Room Air</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/*  RESCHEDULE APPOINTMENT DIALOG MODAL                                */}
      {/* ================================================================== */}
      {isRescheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#f7f9fb]">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Reschedule Appointment
                </h3>
                <p className="text-xs text-slate-500">
                  Select a new date and time slot for {detail.patient.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRescheduleOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs overflow-y-auto">
              {/* Date Picker */}
              <div>
                <label className="font-semibold text-slate-800 block mb-1.5">
                  Select New Date
                </label>
                <div className="border border-slate-200 rounded-lg p-3 bg-white">
                  <div className="flex justify-between items-center mb-2 font-semibold text-slate-900">
                    <span>{format(rescheduleMonth, "MMMM yyyy")}</span>
                    <div className="flex gap-1 text-slate-400">
                      <button
                        type="button"
                        onClick={() => setRescheduleMonth((m) => subMonths(m, 1))}
                        className="hover:text-slate-600 p-0.5"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRescheduleMonth((m) => addMonths(m, 1))}
                        className="hover:text-slate-600 p-0.5"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400 font-bold mb-1">
                    <div>Su</div>
                    <div>Mo</div>
                    <div>Tu</div>
                    <div>We</div>
                    <div>Th</div>
                    <div>Fr</div>
                    <div>Sa</div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {Array.from({ length: calStartDow }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: calDaysInMonth }, (_, i) => i + 1).map(
                      (d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setRescheduleDate(d)}
                          className={`py-1 rounded font-semibold transition ${
                            rescheduleDate === d
                              ? "bg-[#004ac6] text-white"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {d}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Time Slot Selection */}
              <div>
                <label className="font-semibold text-slate-800 block mb-1.5">
                  Select Time Slot
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {RESCHEDULE_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setRescheduleTime(slot)}
                      className={`py-2 border rounded-lg font-semibold transition ${
                        rescheduleTime === slot
                          ? "border-[#004ac6] bg-blue-50 text-[#004ac6]"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Input */}
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Reason for Rescheduling (Optional)
                </label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Patient requested morning slot change"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:border-[#004ac6] outline-none text-xs"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-[#f7f9fb] flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsRescheduleOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isRescheduling}
                onClick={handleConfirmReschedule}
                className="bg-[#004ac6] hover:bg-blue-700 text-white font-semibold"
              >
                {isRescheduling ? "Updating..." : "Confirm Reschedule"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
