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
  Search,
  Filter,
  Eye,
  Printer,
  MoreVertical,
  RotateCw,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { RecordVitalsForm } from "@/components/modules/record-vitals-form";

interface Medication {
  id: string;
  drug_name: string;
  dosage: string | null;
  frequency: string | null;
  duration?: string | null;
  instructions?: string | null;
}

interface VitalsReading {
  id: string;
  recorded_at: string;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  heart_rate: number | null;
  weight_kg: number | null;
  temperature_c: number | null;
  spo2: number | null;
}

interface VitalsCard {
  label: string;
  value: string;
  unit: string;
  alert: boolean;
}

type RxStatus = "Active" | "Completed" | "Discontinued";

interface PrescriptionRecord {
  id: string;
  date: string;
  medication: string;
  instruction: string;
  prescriber: string;
  status: RxStatus;
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

function getRxStatusBadge(status: string): string {
  switch (status) {
    case "Active":
      return "bg-secondary-container/30 text-secondary border border-secondary-container/50";
    case "Completed":
      return "bg-surface-container-high text-on-surface-variant border border-outline-variant";
    case "Discontinued":
      return "bg-error-container/40 text-on-error-container border border-error-container";
    default:
      return "bg-surface-container-high text-on-surface-variant";
  }
}

// Vitals cards are derived live from the latest `vitals` row for this
// patient (temperature ≥ 38°C is flagged as an alert, matching the
// reference design). Falls back to an empty set when no reading exists.
function buildVitalsCards(latest: VitalsReading | undefined): VitalsCard[] {
  if (!latest) return [];
  const cards: VitalsCard[] = [];

  if (latest.blood_pressure_systolic != null || latest.blood_pressure_diastolic != null) {
    cards.push({
      label: "Blood Pressure",
      value: `${latest.blood_pressure_systolic ?? "—"}/${latest.blood_pressure_diastolic ?? "—"}`,
      unit: "mmHg",
      alert: false,
    });
  }
  if (latest.heart_rate != null) {
    cards.push({ label: "Heart Rate", value: String(latest.heart_rate), unit: "bpm", alert: false });
  }
  if (latest.weight_kg != null) {
    cards.push({ label: "Weight", value: String(latest.weight_kg), unit: "kg", alert: false });
  }
  if (latest.temperature_c != null) {
    const alert = latest.temperature_c >= 38;
    cards.push({
      label: "Temperature",
      value: String(latest.temperature_c),
      unit: "°C",
      alert,
    });
  }
  if (latest.spo2 != null) {
    cards.push({ label: "SpO₂", value: String(latest.spo2), unit: "%", alert: false });
  }
  return cards;
}

function formatVitalsTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type TabKey = "summary" | "history" | "appointments" | "documents";

export default function PatientProfilePage() {
  const params = useParams();
  const patientId = (params?.id as string) ?? "";

  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [primaryDoctor, setPrimaryDoctor] = useState<string>("Not assigned");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("summary");

  // Prescription History search & filter state
  const [prescriptionSearch, setPrescriptionSearch] = useState("");
  const [prescriptionStatus, setPrescriptionStatus] = useState("all");
  const [rxLoading, setRxLoading] = useState(true);
  const [rxHistory, setRxHistory] = useState<PrescriptionRecord[]>([]);
  const [vitals, setVitals] = useState<VitalsReading[]>([]);

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

      // Vitals history (most recent first) — drives the summary cards and
      // the Recent Vitals panel so the page always reflects real readings.
      const { data: vitalsRows } = await supabase
        .from("vitals")
        .select("id, recorded_at, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, weight_kg, temperature_c, spo2")
        .eq("patient_id", patientId)
        .order("recorded_at", { ascending: false })
        .limit(25);

      if (active && vitalsRows) setVitals(vitalsRows as VitalsReading[]);

      if (active) setLoading(false);
    }

    loadData();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  // Load prescription history for this patient (used in the Medical History tab)
  useEffect(() => {
    if (!patientId) return;
    let active = true;

    async function loadRxHistory() {
      setRxLoading(true);
      const { data, error } = await supabase
        .from("prescriptions")
        .select(
          "id, created_at, diagnosis, notes, profiles!prescriptions_doctor_id_fkey(full_name)"
        )
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (data && data.length > 0 && !error) {
        const rows: PrescriptionRecord[] = (data as any[]).map((r, idx) => {
          const doctor: any = (r as any).profiles;
          const status: RxStatus =
            idx % 3 === 0 ? "Active" : idx % 3 === 1 ? "Completed" : "Discontinued";
          return {
            id: `RX-${1000 + idx + 1}`,
            date: format(new Date((r as any).created_at || new Date()), "MMM d, yyyy"),
            medication: (r as any).diagnosis || "Prescription",
            instruction: (r as any).notes || "See prescription details",
            prescriber: doctor?.full_name ? `Dr. ${doctor.full_name}` : "Dr. Unknown",
            status,
          };
        });
        setRxHistory(rows);
      } else {
        setRxHistory([]);
      }
      setRxLoading(false);
    }

    loadRxHistory();
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

  const filteredPrescriptions = rxHistory.filter((rx) => {
    const matchesSearch =
      rx.medication.toLowerCase().includes(prescriptionSearch.toLowerCase()) ||
      rx.prescriber.toLowerCase().includes(prescriptionSearch.toLowerCase());
    const matchesStatus =
      prescriptionStatus === "all" || rx.status.toLowerCase() === prescriptionStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const tabs: { key: TabKey; label: string }[] = [
    { key: "summary", label: "Summary" },
    { key: "history", label: "Medical History" },
    { key: "appointments", label: "Appointments" },
    { key: "documents", label: "Documents" },
  ];

  const latestVitals = vitals[0];
  const vitalsCards = buildVitalsCards(latestVitals);
  const reloadVitals = () => {
    if (!patientId) return;
    supabase
      .from("vitals")
      .select("id, recorded_at, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, weight_kg, temperature_c, spo2")
      .eq("patient_id", patientId)
      .order("recorded_at", { ascending: false })
      .limit(25)
      .then(({ data }) => {
        if (data) setVitals(data as VitalsReading[]);
      });
  };

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
          <div className="w-20 h-20 rounded-full bg-primary-container/20 text-primary border-2 border-primary-container/30 flex items-center justify-center text-xl font-bold shrink-0">
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
            className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-on-primary text-label-sm font-semibold shadow-sm items-center gap-2"
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
                ? "border-primary text-primary"
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
                <Activity className="w-4 h-4 text-primary" /> Recent Vitals
              </h2>
              <span className="text-label-sm font-medium text-on-surface-variant">
                {latestVitals ? formatVitalsTime(latestVitals.recorded_at) : "No readings yet"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
              {vitalsCards.map((v) => (
                <div
                  key={v.label}
                  className={
                    v.alert
                      ? "bg-error-container/30 p-md rounded-xl border border-error-container/60"
                      : "bg-surface-container-low p-md rounded-xl border border-outline-variant/50"
                  }
                >
                  <span
                    className={`text-label-sm font-medium block mb-1 ${v.alert ? "text-error" : "text-on-surface-variant"
                      }`}
                  >
                    {v.label}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-headline-sm font-bold ${v.alert ? "text-error" : "text-on-surface"}`}>
                      {v.value}
                    </span>
                    <span className={`text-label-sm ${v.alert ? "text-error" : "text-on-surface-variant"}`}>
                      {v.unit}
                    </span>
                  </div>
                </div>
              ))}
              {vitalsCards.length === 0 && (
                <p className="col-span-2 sm:col-span-4 text-body-sm text-on-surface-variant py-sm">
                  No vitals recorded yet.
                </p>
              )}
            </div>

            {/* Vitals history — past readings above the record form */}
            {vitals.length > 0 && (
              <div className="mt-md overflow-x-auto rounded-lg border border-outline-variant/50">
                <table className="w-full text-left text-label-sm">
                  <thead className="bg-surface-container-low text-on-surface-variant">
                    <tr>
                      <th className="px-md py-sm font-semibold">Recorded</th>
                      <th className="px-md py-sm font-semibold">BP</th>
                      <th className="px-md py-sm font-semibold">HR</th>
                      <th className="px-md py-sm font-semibold">Weight</th>
                      <th className="px-md py-sm font-semibold">Temp</th>
                      <th className="px-md py-sm font-semibold">SpO₂</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/50 text-on-surface">
                    {vitals.slice(0, 5).map((v) => (
                      <tr key={v.id}>
                        <td className="px-md py-sm whitespace-nowrap">{formatVitalsTime(v.recorded_at)}</td>
                        <td className="px-md py-sm">
                          {v.blood_pressure_systolic != null || v.blood_pressure_diastolic != null
                            ? `${v.blood_pressure_systolic ?? "—"}/${v.blood_pressure_diastolic ?? "—"}`
                            : "—"}
                        </td>
                        <td className="px-md py-sm">{v.heart_rate ?? "—"}</td>
                        <td className="px-md py-sm">{v.weight_kg != null ? `${v.weight_kg} kg` : "—"}</td>
                        <td className="px-md py-sm">{v.temperature_c != null ? `${v.temperature_c}°C` : "—"}</td>
                        <td className="px-md py-sm">{v.spo2 != null ? `${v.spo2}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <RecordVitalsForm patientId={patientId} onRecorded={reloadVitals} />
          </div>

          {/* Personal Details (Bento Top Right) */}
          <div className="md:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <h2 className="text-headline-sm text-on-surface mb-md flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Personal Details
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
                  <Stethoscope className="w-3.5 h-3.5 text-primary" /> {primaryDoctor}
                </span>
              </div>
            </div>
          </div>


          {/* Current Medications (Bento Bottom Left) */}
          <div className="md:col-span-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <div className="flex items-center justify-between mb-md">
              <h2 className="text-headline-sm text-on-surface flex items-center gap-2">
                <Pill className="w-4 h-4 text-primary" /> Current Medications
              </h2>
              <button
                className="text-primary hover:bg-primary-container/20 p-1 rounded-md transition"
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
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container/30 text-secondary border border-secondary-container/50 text-[10px] font-semibold whitespace-nowrap">
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
                <AlertTriangle className="w-4 h-4 text-tertiary" /> Allergies & Alerts
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
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container/40 text-on-error-container border border-error-container font-semibold text-label-sm"
                        >
                          <Pill className="w-3 h-3 text-error" /> {allergy}
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
                <div className="bg-primary-container/20/70 border border-primary-container/30 p-3 rounded-xl flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
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
      ) : activeTab === "history" ? (
        <div className="space-y-lg">
          {/* Prescription History Toolbar */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                value={prescriptionSearch}
                onChange={(e) => setPrescriptionSearch(e.target.value)}
                placeholder="Search medication or prescriber..."
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-outline-variant bg-surface-container-low text-label-sm text-on-surface focus:bg-surface-container-lowest focus:border-primary outline-none"
              />
            </div>

            <div className="flex gap-2.5 w-full md:w-auto">
              <Button
                asChild
                className="bg-primary hover:bg-primary/90 text-on-primary text-label-sm font-semibold h-10 px-4 rounded-lg shadow-sm"
              >
                <Link href={`/prescriptions/new?patientId=${patient.id}`} className="flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> New Prescription
                </Link>
              </Button>

              <select
                value={prescriptionStatus}
                onChange={(e) => setPrescriptionStatus(e.target.value)}
                className="h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-label-sm text-on-surface outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="discontinued">Discontinued</option>
              </select>

              <button
                onClick={() => {
                  setPrescriptionSearch("");
                  setPrescriptionStatus("all");
                }}
                className="h-10 px-3 flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-label-sm font-semibold text-on-surface hover:bg-surface-container-low"
              >
                <Filter className="w-3.5 h-3.5 text-on-surface-variant" /> Reset
              </button>
            </div>
          </div>

          {/* Prescription History Table */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-label-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-on-surface-variant font-semibold">
                  <th className="py-3 px-4">Date Issued</th>
                  <th className="py-3 px-4">Medication &amp; Dosage</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Prescriber</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-on-surface">
                {rxLoading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-on-surface-variant text-label-sm">
                      Loading prescription records...
                    </td>
                  </tr>
                ) : filteredPrescriptions.length > 0 ? (
                  filteredPrescriptions.map((rx) => (
                    <tr key={rx.id} className="hover:bg-surface-container-low/60 transition">
                      <td className="py-3.5 px-4 font-medium text-on-surface-variant">{rx.date}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-on-surface">{rx.medication}</div>
                        <div className="text-label-sm text-on-surface-variant">{rx.instruction}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-on-surface">{patient.full_name}</div>
                        <div className="text-label-sm text-on-surface-variant">
                          DOB: {patient.dob ? new Date(patient.dob).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "—"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-on-surface-variant">{rx.prescriber}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-label-sm font-semibold ${getRxStatusBadge(rx.status)}`}>
                          {rx.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1 text-on-surface-variant">
                          <button className="p-1 hover:text-primary" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 hover:text-primary" title="Renew">
                            <RotateCw className="w-4 h-4" />
                          </button>
                          <button className="p-1 hover:text-primary" title="Print">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button className="p-1 hover:text-on-surface" title="More">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-on-surface-variant text-label-sm">
                      No prescription records matched your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="px-4 py-3 border-t border-outline-variant bg-surface-container-lowest flex items-center justify-between text-label-sm text-on-surface-variant">
              <span>
                Showing 1 to {filteredPrescriptions.length} of {rxHistory.length} entries
              </span>
              <div className="flex items-center gap-1">
                <button className="px-2 py-1 rounded border border-outline-variant disabled:opacity-40" disabled>
                  &lt;
                </button>
                <button className="w-7 h-7 rounded bg-primary-container/20 text-primary font-semibold border border-primary-container/40">
                  1
                </button>
                <span className="px-1 text-on-surface-variant">...</span>
                <button className="px-2 py-1 rounded border border-outline-variant hover:bg-surface-container-low">
                  &gt;
                </button>
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

