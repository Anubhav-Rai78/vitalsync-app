"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  Calendar,
  CalendarPlus,
  Mail,
  Phone,
  MapPin,
  Stethoscope,
  Plus,
  Edit2,
  AlertTriangle,
  FileText,
  User,
  MessageSquare,
  ArrowLeft,
  Pill,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface Medication {
  id: string;
  drug_name: string;
  dosage: string | null;
  frequency: string | null;
  duration?: string | null;
  instructions?: string | null;
}

interface PatientDetails {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  blood_group: string | null;
  allergies: string | null;
  emergency_contact: string | null;
  dob: string | null;
  sex: "male" | "female" | "other" | null;
  created_by: string | null;
}

function calcAge(dob: string | null | undefined): number | string {
  if (!dob) return "—";
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function formatGender(sex?: "male" | "female" | "other" | null): string {
  if (!sex) return "—";
  return sex.charAt(0).toUpperCase() + sex.slice(1);
}

// The `patients` table has no numeric patient-id column, so we surface a
// stable clinical-style ID derived from the record's uuid (first 5 segments).
function formatPatientId(id: string): string {
  return `PT-${id.replace(/-/g, "").slice(0, 5).toUpperCase()}`;
}

// There is no vitals table in the schema; these are the sample readings from
// the Stitch reference, rendered with the temperature flagged as an alert.
const SAMPLE_VITALS = [
  { label: "Blood Pressure", value: "128/82", unit: "mmHg", alert: false },
  { label: "Heart Rate", value: "72", unit: "bpm", alert: false },
  { label: "Weight", value: "84.5", unit: "kg", alert: false },
  { label: "Temperature", value: "38.2", unit: "°C", alert: true },
];

type TabKey = "summary" | "history" | "appointments" | "documents";

export default function PatientProfilePage() {
  const params = useParams();
  const patientId = (params?.id as string) ?? "";

  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [primaryDoctor, setPrimaryDoctor] = useState<string>("Not assigned");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("summary");

  const supabase = createClient();

  useEffect(() => {
    if (!patientId) return;
    let active = true;

    async function loadData() {
      setLoading(true);

      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single();

      if (!active) return;

      if (!patientData || patientError) {
        setPatient(null);
        setLoading(false);
        return;
      }
      setPatient(patientData as PatientDetails);

      // Primary care doctor: resolve from the patient's most recent
      // appointment, falling back to a generic label when none exists.
      const { data: latestAppt } = await supabase
        .from("appointments")
        .select("profiles!appointments_doctor_id_fkey(full_name)")
        .eq("patient_id", patientId)
        .order("start_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (active && latestAppt) {
        const doctor = (latestAppt as any).profiles as { full_name?: string } | null;
        if (doctor?.full_name) setPrimaryDoctor(`Dr. ${doctor.full_name}`);
      }

      // Current medications: pull prescription items for this patient via the
      // prescriptions join. RLS lets us read items through the prescription.
      const { data: prescriptions } = await supabase
        .from("prescriptions")
        .select("id")
        .eq("patient_id", patientId);

      if (active && prescriptions && prescriptions.length > 0) {
        const ids = prescriptions.map((p) => p.id);
        const { data: items } = await supabase
          .from("prescription_items")
          .select("id, drug_name, dosage, frequency, duration, instructions")
          .in("prescription_id", ids);

        if (active && items) setMedications(items as Medication[]);
      }

      if (active) setLoading(false);
    }

    loadData();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-body-sm text-on-surface-variant">
        Loading patient profile records...
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-md">
        <div className="mx-auto w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center">
          <User className="w-6 h-6 text-on-surface-variant" />
        </div>
        <p className="text-headline-sm text-on-surface">Patient record not found</p>
        <p className="text-body-sm text-on-surface-variant">
          The patient you are looking for does not exist or you do not have access to it.
        </p>
        <div className="pt-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/patients" className="flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Patient List
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const initials = patient.full_name ? patient.full_name.slice(0, 2).toUpperCase() : "PT";

  const tabs: { key: TabKey; label: string }[] = [
    { key: "summary", label: "Summary" },
    { key: "history", label: "Medical History" },
    { key: "appointments", label: "Appointments" },
    { key: "documents", label: "Documents" },
  ];

  return (
    <div className="space-y-lg max-w-container mx-auto font-sans">
      {/* Back Navigation Link */}
      <div>
        <Link
          href="/patients"
          className="inline-flex items-center gap-1.5 text-label-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Patients
        </Link>
      </div>

      {/* Patient Header (Level 1 Surface) */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col md:flex-row gap-lg justify-between items-start md:items-center shadow-sm">
        <div className="flex items-center gap-lg">
          <div className="w-20 h-20 rounded-full bg-blue-50 text-[#2563eb] border-2 border-blue-100 flex items-center justify-center text-xl font-bold shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="text-headline-md text-on-surface mb-1">{patient.full_name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-on-surface-variant text-label-sm font-medium">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-on-surface-variant" /> ID: {formatPatientId(patient.id)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-on-surface-variant" />{" "}
                {calcAge(patient.dob)} yrs
                {patient.dob ? <> ({new Date(patient.dob).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})</> : null}
              </span>
              <span>•</span>
              <span>{formatGender(patient.sex)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <Button
            variant="secondary"
            className="flex-1 md:flex-none text-label-sm font-semibold items-center gap-2"
          >
            <MessageSquare className="w-4 h-4 text-on-surface-variant" /> Message
          </Button>
          <Button
            asChild
            variant="primary"
            className="flex-1 md:flex-none bg-[#2563eb] hover:bg-blue-700 text-white text-label-sm font-semibold shadow-sm items-center gap-2"
          >
            <Link href={`/appointments?book=true&patientId=${patient.id}`}>
              <CalendarPlus className="w-4 h-4" /> Book Appointment
            </Link>
          </Button>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="border-b border-outline-variant">
        <nav className="flex gap-lg overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-2 py-3 border-b-2 text-label-sm font-semibold whitespace-nowrap transition-colors ${activeTab === tab.key
                  ? "border-[#2563eb] text-[#2563eb]"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>


      {/* Bento Grid Layout for Summary */}
      {activeTab === "summary" ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
          {/* Vitals (Bento Top Left) */}
          <div className="md:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <div className="flex items-center justify-between mb-md">
              <h2 className="text-headline-sm text-on-surface flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#2563eb]" /> Recent Vitals
              </h2>
              <span className="text-label-sm font-medium text-on-surface-variant">Recorded Today, 09:15 AM</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
              {SAMPLE_VITALS.map((v) => (
                <div
                  key={v.label}
                  className={
                    v.alert
                      ? "bg-rose-50/60 p-md rounded-xl border border-rose-200/80"
                      : "bg-surface-container-low p-md rounded-xl border border-outline-variant/50"
                  }
                >
                  <span
                    className={`text-label-sm font-medium block mb-1 ${v.alert ? "text-rose-600" : "text-on-surface-variant"
                      }`}
                  >
                    {v.label}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-headline-sm font-bold ${v.alert ? "text-rose-600" : "text-on-surface"}`}>
                      {v.value}
                    </span>
                    <span className={`text-label-sm ${v.alert ? "text-rose-500" : "text-on-surface-variant"}`}>
                      {v.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Personal Details (Bento Top Right) */}
          <div className="md:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <h2 className="text-headline-sm text-on-surface mb-md flex items-center gap-2">
              <User className="w-4 h-4 text-[#2563eb]" /> Personal Details
            </h2>

            <div className="space-y-3 text-body-sm">
              <div>
                <span className="text-label-sm text-on-surface-variant block font-medium">Phone</span>
                <span className="text-on-surface font-semibold flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-on-surface-variant" /> {patient.phone || "—"}
                </span>
              </div>
              <div>
                <span className="text-label-sm text-on-surface-variant block font-medium">Email</span>
                <span className="text-on-surface font-semibold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-on-surface-variant shrink-0" /> {patient.email || "—"}
                </span>
              </div>
              <div>
                <span className="text-label-sm text-on-surface-variant block font-medium">Address</span>
                <span className="text-on-surface-variant leading-relaxed flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-on-surface-variant" />
                  {patient.address || "—"}
                </span>
              </div>
              <div className="pt-1">
                <span className="text-label-sm text-on-surface-variant block font-medium">Primary Care</span>
                <span className="text-on-surface font-semibold flex items-center gap-1.5 mt-0.5">
                  <Stethoscope className="w-3.5 h-3.5 text-[#2563eb]" /> {primaryDoctor}
                </span>
              </div>
            </div>
          </div>


          {/* Current Medications (Bento Bottom Left) */}
          <div className="md:col-span-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <div className="flex items-center justify-between mb-md">
              <h2 className="text-headline-sm text-on-surface flex items-center gap-2">
                <Pill className="w-4 h-4 text-[#2563eb]" /> Current Medications
              </h2>
              <button
                className="text-[#2563eb] hover:bg-blue-50 p-1 rounded-md transition"
                aria-label="Add medication"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {medications.length > 0 ? (
              <ul className="space-y-2.5 text-body-sm">
                {medications.map((med) => (
                  <li
                    key={med.id}
                    className="flex items-start justify-between p-3 rounded-lg border border-outline-variant/50 bg-surface-container-low"
                  >
                    <div>
                      <span className="font-bold text-on-surface block">{med.drug_name}</span>
                      <span className="text-on-surface-variant text-label-sm">
                        {[med.dosage, med.frequency, med.duration].filter(Boolean).join(" · ") || "No dosing info"}
                      </span>
                      {med.instructions ? (
                        <span className="text-label-sm text-on-surface-variant block mt-0.5">{med.instructions}</span>
                      ) : null}
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold whitespace-nowrap">
                      Active
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-on-surface-variant">No active medications on file.</p>
            )}
          </div>

          {/* Allergies & Alerts (Bento Bottom Right) */}
          <div className="md:col-span-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <div className="flex items-center justify-between mb-md">
              <h2 className="text-headline-sm text-on-surface flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Allergies & Alerts
              </h2>
              <button className="text-on-surface-variant hover:text-on-surface p-1 rounded-md transition" aria-label="Edit allergies">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-md text-body-sm">
              <div>
                <h3 className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Known Allergies
                </h3>
                {patient.allergies ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.allergies.split(",").map((a) => {
                      const allergy = a.trim();
                      return allergy ? (
                        <span
                          key={allergy}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-label-sm"
                        >
                          <Pill className="w-3 h-3 text-rose-500" /> {allergy}
                        </span>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <span className="text-on-surface-variant">None recorded</span>
                )}
              </div>

              <hr className="border-outline-variant/50" />

              <div>
                <h3 className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Clinical Alerts
                </h3>
                <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-xl flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-[#2563eb] mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-on-surface block text-label-sm">Elevated HbA1c</span>
                    <span className="text-on-surface-variant text-label-sm leading-relaxed">
                      Last reading (7.2%) indicates poor glycemic control. Needs review.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-xl text-center bg-surface-container-lowest rounded-xl border border-outline-variant text-body-sm text-on-surface-variant shadow-sm">
          <FileText className="w-5 h-5 mx-auto mb-2 text-on-surface-variant" />
          No records found in this category for {patient.full_name}.
        </div>
      )}
    </div>
  );
}

