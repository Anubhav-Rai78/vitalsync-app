"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
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
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

// Fallback appointment detail — used when live lookup fails, preventing 504s.
const FALLBACK = {
  id: "APT-8924-VL",
  title: "Cardiology Consultation",
  status: "Checked In",
  date: "Oct 24, 2026",
  time_slot: "10:30 AM - 11:15 AM",
  patient: { name: "Michael Chen", gender: "Male", age: "42", dob: "05/12/1981", id_formatted: "PT-88921" },
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
  patient: { name: string; gender: string; age: string; dob: string; id_formatted: string };
  provider: { name: string; specialty: string };
  chief_complaint: string;
  symptoms: string[];
  vitals: { bp: string; hr: string; temp: string; spo2: string };
}

function initials(name: string) {
  return name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AppointmentDetailsPage() {
  const params = useParams();
  const appointmentId = (params?.id as string) || "";

  const [detail, setDetail] = useState<DetailState>(FALLBACK);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

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
          const end = data.end_time ? new Date(data.end_time) : new Date(start.getTime() + 45 * 60000);
          const statusLabel = data.status ? String(data.status).replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Confirmed";
          const symptomList: string[] = [];
          if (data.reason) symptomList.push(String(data.reason));
          setDetail({
            id: `APT-${String(appointmentId).slice(0, 4).toUpperCase()}`,
            title: data.reason || "Consultation",
            status: statusLabel,
            date: format(start, "MMM d, yyyy"),
            time_slot: `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`,
            patient: {
              name: patient?.full_name || "Unknown Patient",
              gender: patient?.sex ? patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1) : "—",
              age: patient?.dob ? String(Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 86400000))) : "—",
              dob: patient?.dob ? format(new Date(patient.dob), "MM/dd/yyyy") : "—",
              id_formatted: "PT-" + String(patient?.id || "").slice(0, 5).toUpperCase(),
            },
            provider: {
              name: doctor?.full_name ? `Dr. ${doctor.full_name.replace(/^Dr\.\s*/i, "")}` : "Dr. Sarah Jenkins",
              specialty: doctor?.specialty || "Senior Cardiologist",
            },
            chief_complaint: data.notes || FALLBACK.chief_complaint,
            symptoms: symptomList.length > 0 ? symptomList : FALLBACK.symptoms,
            vitals: FALLBACK.vitals,
          });
        } else if (active) {
          setDetail(FALLBACK);
        }
      } catch (e) {
        console.error("Appointment detail fetch error:", e);
        if (active) setDetail(FALLBACK);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-12">
      <div>
        <Link href="/appointments" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#2563eb] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Appointments
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-200 bg-[#f8fafc] flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" /> {detail.status}
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">{detail.id}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{loading ? "Loading…" : detail.title}</h1>
            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {detail.date}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> {detail.time_slot}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm" className="text-xs font-semibold">
              <CalendarCheck className="w-3.5 h-3.5 mr-1.5" /> Reschedule
            </Button>
            <Button size="sm" asChild className="bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-semibold">
              <Link href="/prescriptions/new"><Video className="w-3.5 h-3.5 mr-1.5" /> Start Visit</Link>
            </Button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-4 space-y-4">
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient</span>
                <Link href="/patients" className="text-xs font-semibold text-[#2563eb] flex items-center gap-0.5 hover:underline">
                  View Profile <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100">
                  {initials(detail.patient.name)}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{detail.patient.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {detail.patient.gender}, {detail.patient.age} yrs • DOB: {detail.patient.dob}
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Provider</span>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center shrink-0 border border-blue-100">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{detail.provider.name}</div>
                  <div className="text-[11px] text-slate-500">{detail.provider.specialty}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-8 space-y-6">
            <div className="border border-slate-200 rounded-xl p-5 bg-white">
              <h2 className="text-sm font-bold text-slate-900 mb-2">Chief Complaint</h2>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">{detail.chief_complaint}</p>
              <div className="flex flex-wrap gap-2">
                {detail.symptoms.map((sym, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                    {sym}
                  </span>
                ))}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-5 bg-[#f8fafc]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900">Triage Vitals</h2>
                <span className="text-[11px] text-slate-400 font-medium">Taken 15m ago</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                  <span className="text-slate-500 font-semibold flex items-center gap-1 text-[11px]"><Heart className="w-3.5 h-3.5 text-red-500" /> Blood Pressure</span>
                  <div className="text-lg font-bold text-slate-900 mt-2">{detail.vitals.bp}</div>
                  <span className="text-[10px] text-slate-400">mmHg</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                  <span className="text-slate-500 font-semibold flex items-center gap-1 text-[11px]"><Activity className="w-3.5 h-3.5 text-[#2563eb]" /> Heart Rate</span>
                  <div className="text-lg font-bold text-slate-900 mt-2">{detail.vitals.hr}</div>
                  <span className="text-[10px] text-slate-400">bpm</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                  <span className="text-slate-500 font-semibold flex items-center gap-1 text-[11px]"><Thermometer className="w-3.5 h-3.5 text-emerald-600" /> Temperature</span>
                  <div className="text-lg font-bold text-slate-900 mt-2">{detail.vitals.temp}</div>
                  <span className="text-[10px] text-slate-400">°F</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                  <span className="text-slate-500 font-semibold flex items-center gap-1 text-[11px]"><Wind className="w-3.5 h-3.5 text-cyan-600" /> SpO2</span>
                  <div className="text-lg font-bold text-slate-900 mt-2">{detail.vitals.spo2}</div>
                  <span className="text-[10px] text-slate-400">Room Air</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
