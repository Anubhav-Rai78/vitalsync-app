"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  format,
} from "date-fns";
import {
  Star,
  MessageSquare,
  CalendarPlus,
  ArrowLeft,
  Users,
  CalendarClock,
  Award,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  DoctorAvailabilityEditor,
  type DayAvailability,
} from "@/components/modules/doctor-availability-editor";

// Doctors are rows in `profiles` (role = 'doctor') — there is no separate
// `doctors` table, and there is no ratings / schedule / bio table either.
// Avg Rating, the weekly availability grid and the About text are therefore
// derived statically (kept in sync with the Stitch reference), while every
// metric that has a real source is computed live: the profile row, total
// distinct patients (via appointments), appointments this week, today's
// upcoming appointments, and experience from the profile's created_at.
interface DoctorProfile {
  id: string;
  full_name: string;
  specialty: string | null;
  phone: string | null;
  avatar_url: string | null;
  license_no: string | null;
  is_active: boolean;
  created_at: string;
}

interface AppointmentItem {
  name: string;
  type: string;
  time: string;
}

// Sub-specialty pills derive from the doctor's real `specialty` value via
// this deterministic map (falls back to general outpatient areas).
const SPECIALTY_AREAS: Record<string, string[]> = {
  cardiology: [
    "Preventive Cardiology",
    "Heart Failure",
    "Echocardiography",
    "Hypertension Management",
  ],
  pediatrics: [
    "General Pediatrics",
    "Neonatology",
    "Pediatric Nutrition",
    "Vaccination Clinics",
  ],
  neurology: [
    "Stroke Management",
    "Epilepsy Care",
    "Migraine Treatment",
    "Movement Disorders",
  ],
  general: [
    "Preventive Care",
    "Chronic Disease Management",
    "Primary Care",
    "Geriatrics",
  ],
  orthopedics: [
    "Joint Replacement",
    "Sports Medicine",
    "Fracture Care",
    "Arthritis Management",
  ],
  dermatology: [
    "Medical Dermatology",
    "Skin Cancer Screening",
    "Acne Treatment",
    "Cosmetic Dermatology",
  ],
};

// Availability is real data from the `doctor_availability` table
// (one row per doctor per day of week), created/updated inline via the
// DoctorAvailabilityEditor below.

// Sunday = 0 … Saturday = 6 (JS Date.getDay()); shown Monday-first.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

function formatTime(twelveHour: string): string {
  if (!twelveHour) return "—";
  const [hRaw, mRaw] = twelveHour.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return twelveHour;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function getInitials(fullName: string): string {
  return fullName.replace(/^dr\.?\s+/i, "").slice(0, 2).toUpperCase();
}

function getExperienceYears(createdAt: string): number {
  const years = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
  return Math.max(1, years);
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

function getSpecialtyAreas(specialty: string | null): string[] {
  const key = (specialty ?? "").toLowerCase();
  if (SPECIALTY_AREAS[key]) return SPECIALTY_AREAS[key];
  const found = Object.entries(SPECIALTY_AREAS).find(([k]) =>
    key.includes(k)
  );
  return found ? found[1] : [...(SPECIALTY_AREAS.general ?? [])];
}

export default function DoctorProfilePage() {
  const params = useParams();
  const doctorId = (params?.id as string) ?? "";

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("summary");
  const [metrics, setMetrics] = useState({ totalPatients: 0, apptsThisWeek: 0 });
  const [upcomingToday, setUpcomingToday] = useState<AppointmentItem[]>([]);
  const [availabilityByDay, setAvailabilityByDay] = useState<Record<number, DayAvailability>>({});
  const [canEditAvailability, setCanEditAvailability] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!doctorId) return;
    let active = true;

    async function loadDoctor() {
      setLoading(true);
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const dayStart = startOfDay(now);
      const dayEnd = endOfDay(now);

      const [docRes, todayRes, weekRes, patientIdsRes, availabilityRes, meRes] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, specialty, phone, avatar_url, license_no, is_active, created_at"
          )
          .eq("id", doctorId)
          .eq("role", "doctor")
          .single(),
        supabase
          .from("appointments")
          .select("id, start_time, reason, patients(full_name)")
          .eq("doctor_id", doctorId)
          .gte("start_time", dayStart.toISOString())
          .lt("start_time", dayEnd.toISOString())
          .notIn("status", ["cancelled", "no_show"])
          .order("start_time", { ascending: true })
          .limit(6),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("doctor_id", doctorId)
          .gte("start_time", weekStart.toISOString())
          .lt("start_time", weekEnd.toISOString()),
        supabase
          .from("appointments")
          .select("patient_id")
          .eq("doctor_id", doctorId),
        supabase
          .from("doctor_availability")
          .select("day_of_week, start_time, end_time, is_available")
          .eq("doctor_id", doctorId),
        supabase.auth.getUser(),
      ]);

      // Build the availability map keyed by day_of_week (0=Sun..6=Sat).
      if (active && availabilityRes.data) {
        const byDay: Record<number, DayAvailability> = {};
        for (const row of availabilityRes.data as {
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_available: boolean;
        }[]) {
          byDay[row.day_of_week] = {
            start_time: row.start_time.slice(0, 5),
            end_time: row.end_time.slice(0, 5),
            is_available: row.is_available,
          };
        }
        setAvailabilityByDay(byDay);
      }

      // Ownership check: the doctor viewing their own profile, or an admin.
      if (active && meRes.data.user) {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", meRes.data.user.id)
          .single();
        setCanEditAvailability(
          !!myProfile && (myProfile.role === "admin" || meRes.data.user.id === doctorId)
        );
      }

      if (active && docRes.data && !docRes.error) {
        setDoctor(docRes.data as DoctorProfile);
        const uniquePatients = new Set(
          (patientIdsRes.data ?? []).map(
            (a: { patient_id: string | null }) => a.patient_id
          )
        );
        setMetrics({
          totalPatients: uniquePatients.size,
          apptsThisWeek: weekRes.count ?? 0,
        });
      }

      if (active && todayRes.data) {
        setUpcomingToday(
          (
            (todayRes.data ?? []) as unknown as {
              id: string;
              start_time: string;
              reason: string | null;
              patients: { full_name: string } | null;
            }[]
          ).map((a) => ({
            name: a.patients?.full_name ?? "Unknown Patient",
            type: a.reason ?? "Consultation",
            time: format(new Date(a.start_time), "h:mm a"),
          }))
        );
      }

      if (active) setLoading(false);
    }

    loadDoctor();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  const specialtyPills = useMemo(() => {
    if (!doctor) return [];
    const root = doctor.specialty ?? "General Practice";
    return [titleCase(root), ...getSpecialtyAreas(doctor.specialty)];
  }, [doctor]);
if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-body-sm text-on-surface-variant">
        Loading doctor profile...
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <Stethoscope className="w-10 h-10 mx-auto text-on-surface-variant/60" />
        <p className="text-body-md font-semibold text-on-surface">
          Doctor record not found.
        </p>
        <Button asChild variant="secondary" size="sm">
          <Link href="/doctors" className="flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Doctor List
          </Link>
        </Button>
      </div>
    );
  }

  const initials = getInitials(doctor.full_name);
  const experienceYears = getExperienceYears(doctor.created_at);
  const specialtyTitle = doctor.specialty
    ? `Senior ${titleCase(doctor.specialty)}, MD, FACC`
    : "Senior Staff Physician, MD, FACC";

  const about = `Dr. ${doctor.full_name} is a board-certified ${
    doctor.specialty?.toLowerCase() ?? "physician"
  } with over ${experienceYears} years of experience diagnosing and treating complex conditions at the clinic. Committed to providing compassionate, patient-centered care, they combine clinical expertise with the latest advancements in medical technology.`;

  return (
    <div className="space-y-lg max-w-container mx-auto">
      {/* Back Link */}
      <div>
        <Link
          href="/doctors"
          className="inline-flex items-center gap-1.5 text-label-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Doctors
        </Link>
      </div>

      {/* Doctor Header Profile */}
      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg flex flex-col md:flex-row gap-lg items-start md:items-center relative shadow-sm">
        {doctor.avatar_url ? (
          <img
            src={doctor.avatar_url}
            alt={`Dr. ${doctor.full_name}`}
            className="w-28 h-28 rounded-full object-cover border-4 border-outline-variant/50 shrink-0 shadow-sm"
          />
        ) : (
          <div className="w-28 h-28 rounded-full bg-primary-container/20 text-primary border-4 border-outline-variant/40 flex items-center justify-center text-2xl font-bold shrink-0 shadow-sm">
            {initials}
          </div>
        )}

        <div className="flex-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
            <div>
              <h1 className="text-headline-lg text-on-surface">
                Dr. {doctor.full_name}
              </h1>
              <p className="text-body-sm text-on-surface-variant mt-xs font-medium">
                {specialtyTitle}
                {doctor.license_no ? ` · Lic. ${doctor.license_no}` : ""}
              </p>
              <div className="flex items-center gap-1 mt-sm">
                <Star className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                <span className="text-label-md font-bold text-on-surface">4.9</span>
                <span className="text-body-sm text-on-surface-variant ml-xs">
                  (124 Reviews)
                </span>
              </div>
            </div>

            <div className="flex gap-md mt-sm md:mt-0">
              <Button asChild variant="secondary" size="sm">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" /> Message
                </span>
              </Button>
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-on-primary font-semibold">
                <Link
                  href={`/appointments?book=true&doctorId=${doctor.id}`}
                  className="flex items-center gap-1.5"
                >
                  <CalendarPlus className="w-4 h-4" /> Schedule
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="border-b border-outline-variant flex gap-lg overflow-x-auto">
        {(
          [
            { key: "summary", label: "Summary" },
            { key: "schedule", label: "Schedule" },
            { key: "patients", label: "Patients" },
            { key: "professional", label: "Professional Info" },
          ] as { key: TabKey; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-label-sm font-bold pb-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
{/* Bento Grid Content */}
      {activeTab === "summary" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {/* Left Column */}
          <div className="md:col-span-2 space-y-lg">
            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md shadow-sm">
                <Users className="w-4 h-4 text-on-surface-variant mb-sm" />
                <p className="text-headline-md font-bold text-on-surface">
                  {metrics.totalPatients.toLocaleString("en-US")}
                </p>
                <p className="text-label-sm text-on-surface-variant">Total Patients</p>
              </div>
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md shadow-sm">
                <CalendarClock className="w-4 h-4 text-on-surface-variant mb-sm" />
                <p className="text-headline-md font-bold text-on-surface">
                  {metrics.apptsThisWeek.toLocaleString("en-US")}
                </p>
                <p className="text-label-sm text-on-surface-variant">Appts This Week</p>
              </div>
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md shadow-sm">
                <Award className="w-4 h-4 text-on-surface-variant mb-sm" />
                <p className="text-headline-md font-bold text-on-surface">
                  {experienceYears} Yrs
                </p>
                <p className="text-label-sm text-on-surface-variant">Experience</p>
              </div>
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md shadow-sm">
                <Star className="w-4 h-4 text-emerald-600 mb-sm" />
                <p className="text-headline-md font-bold text-emerald-600">4.9</p>
                <p className="text-label-sm text-on-surface-variant">Avg Rating</p>
              </div>
            </div>

            {/* About Card */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
              <h3 className="text-headline-sm text-on-surface mb-md">About</h3>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">{about}</p>
            </div>

            {/* Specialties & Expertise */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
              <h3 className="text-headline-sm text-on-surface mb-md">
                Specialties &amp; Expertise
              </h3>
              <div className="flex flex-wrap gap-sm">
                {specialtyPills.map((pill, idx) => (
                  <span
                    key={idx}
                    className={`px-md py-sm rounded-full border font-semibold text-label-sm ${
                      idx === 0
                        ? "bg-primary/10 text-primary border-primary-container/40"
                        : "bg-primary-container/20 text-primary border-primary-container/30"
                    }`}
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>
          </div>
{/* Right Column */}
          <div className="space-y-lg">
            {/* Availability */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
              <div className="flex justify-between items-center mb-md">
                <h3 className="text-headline-sm text-on-surface">Availability</h3>
                {canEditAvailability && (
                  <button
                    onClick={() => setEditingAvailability((v) => !v)}
                    className="text-primary text-label-sm font-semibold hover:underline"
                  >
                    {editingAvailability ? "Cancel" : "Edit"}
                  </button>
                )}
              </div>

              {editingAvailability ? (
                <DoctorAvailabilityEditor
                  doctorId={doctorId}
                  availabilityByDay={availabilityByDay}
                  onSaved={() => {
                    setEditingAvailability(false);
                    supabase
                      .from("doctor_availability")
                      .select("day_of_week, start_time, end_time, is_available")
                      .eq("doctor_id", doctorId)
                      .then(({ data }) => {
                        if (!data) return;
                        const byDay: Record<number, DayAvailability> = {};
                        for (const row of data as {
                          day_of_week: number;
                          start_time: string;
                          end_time: string;
                          is_available: boolean;
                        }[]) {
                          byDay[row.day_of_week] = {
                            start_time: row.start_time.slice(0, 5),
                            end_time: row.end_time.slice(0, 5),
                            is_available: row.is_available,
                          };
                        }
                        setAvailabilityByDay(byDay);
                      });
                  }}
                />
              ) : (
                <>
                  <ul className="space-y-sm">
                    {DAY_ORDER.filter((d) => availabilityByDay[d]?.is_available).map((d) => (
                      <li
                        key={d}
                        className="flex justify-between items-center text-body-sm text-on-surface-variant"
                      >
                        <span className="font-medium">{DAY_NAMES[d]}</span>
                        <span className="font-semibold text-on-surface">
                          {formatTime(availabilityByDay[d]?.start_time)} — {formatTime(availabilityByDay[d]?.end_time)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {!DAY_ORDER.some((d) => availabilityByDay[d]?.is_available) && (
                    <p className="text-body-sm text-on-surface-variant">
                      No availability set for this week yet.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Upcoming Today */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
              <div className="flex justify-between items-center mb-md">
                <h3 className="text-headline-sm text-on-surface">Upcoming Today</h3>
                <Link
                  href="/appointments"
                  className="text-primary text-label-sm font-semibold hover:underline"
                >
                  View All
                </Link>
              </div>
              {upcomingToday.length > 0 ? (
                <div className="space-y-sm">
                  {upcomingToday.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-sm border-b border-outline-variant/60 pb-sm last:border-0 last:pb-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-bold text-[10px] shrink-0">
                        {item.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-on-surface text-body-sm">{item.name}</p>
                        <p className="text-[11px] text-on-surface-variant">{item.type}</p>
                      </div>
                      <span className="text-[11px] font-semibold text-on-surface-variant">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-body-sm text-on-surface-variant pt-sm">
                  No appointments scheduled for today.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-lg text-center bg-surface-container-lowest rounded-xl border border-outline-variant text-body-sm text-on-surface-variant shadow-sm">
          No records in this category for Dr. {doctor.full_name}.
        </div>
      )}
    </div>
  );
}
type TabKey = "summary" | "schedule" | "patients" | "professional";