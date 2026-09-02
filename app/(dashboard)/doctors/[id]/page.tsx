"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Mail,
  Phone,
  Award,
  Star,
  MessageSquare,
  DoorOpen,
  X,
  Users,
  CalendarPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type TabKey = "summary" | "schedule" | "patients" | "professional";

export default function DoctorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = (params?.id as string) ?? "";

  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("summary");

  // Dynamic Sub-tab Data
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  // Message Modal
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [quickNote, setQuickNote] = useState("");
  const [noteSent, setNoteSent] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!doctorId) return;

    async function loadDoctorProfile() {
      setLoading(true);
      try {
        const { data: doc } = await supabase
          .from("profiles")
          .select("id, full_name, specialty, phone, license_no, is_active, created_at")
          .eq("id", doctorId)
          .single();

        if (doc) setDoctor(doc);

        // Fetch Appointments
        const { data: appts } = await supabase
          .from("appointments")
          .select("id, start_time, end_time, status, reason, patients(id, full_name, phone)")
          .eq("doctor_id", doctorId)
          .order("start_time", { ascending: false });

        if (appts) {
          setAppointments(appts);

          // Extract Unique Patients
          const seen = new Map();
          appts.forEach((a: any) => {
            if (a.patients && !seen.has(a.patients.id)) {
              seen.set(a.patients.id, {
                ...a.patients,
                lastVisit: a.start_time,
              });
            }
          });
          setPatients(Array.from(seen.values()));
        }
      } catch (err) {
        console.error("Error loading doctor profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDoctorProfile();
  }, [doctorId]);

  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim()) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("clinic_id, full_name")
        .eq("id", user.id)
        .single();
      if (!profile) return;

      await supabase.from("audit_logs").insert({
        clinic_id: profile.clinic_id,
        actor_id: user.id,
        action: "internal_doctor_note",
        entity_type: "doctors",
        entity_id: doctorId,
        metadata: { note: quickNote, author: profile.full_name },
      });
      setNoteSent(true);
      setTimeout(() => {
        setNoteSent(false);
        setQuickNote("");
        setIsMessageOpen(false);
      }, 1000);
    } catch (err) {
      console.error("Error logging note:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-body-sm text-on-surface-variant font-sans">
        Loading doctor profile...
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4 font-sans">
        <p className="text-headline-sm text-on-surface">Doctor record not found.</p>
        <Button asChild variant="secondary">
          <Link href="/doctors">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Doctor List
          </Link>
        </Button>
      </div>
    );
  }

  const initials = doctor.full_name
    ? doctor.full_name
        .replace(/^Dr\.\s*/i, "")
        .split(" ")
        .map((p: string) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "DR";

  const doctorEmail = `${(doctor.full_name || "doctor").toLowerCase().replace(/[^a-z]/g, "")}@medflow.com`;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "summary", label: "Summary" },
    { key: "schedule", label: "Schedule" },
    { key: "patients", label: "Patients" },
    { key: "professional", label: "Professional Info" },
  ];

  return (
    <div className="max-w-container-max mx-auto space-y-lg font-body-md text-body-md text-on-background pb-xxl">
      <div>
        <Link
          href="/doctors"
          className="inline-flex items-center gap-1.5 text-label-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Doctors
        </Link>
      </div>

      {/* Header Profile Card */}
      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg flex flex-col md:flex-row gap-lg items-start md:items-center justify-between shadow-sm">
        <div className="flex items-center gap-lg">
          <div className="w-20 h-20 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center text-2xl font-bold shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">
              {doctor.full_name?.startsWith("Dr.") ? doctor.full_name : `Dr. ${doctor.full_name}`}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Senior Specialist in {doctor.specialty || "General Medicine"}
            </p>
            <div className="flex items-center gap-2 mt-xs">
              <Star className="w-4 h-4 text-emerald-600 fill-emerald-600" />
              <span className="font-bold text-on-surface">4.9</span>
              <span className="text-on-surface-variant text-label-sm">(124 Reviews)</span>
              <span className="text-on-surface-variant">&bull;</span>
              <span className="font-mono text-label-sm text-on-surface-variant">
                Lic: {doctor.license_no || "KMC-99214"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-sm w-full md:w-auto">
          <Button
            variant="secondary"
            onClick={() => setIsMessageOpen(true)}
            className="flex-1 md:flex-none flex items-center gap-2 font-label-md"
          >
            <MessageSquare className="w-4 h-4" /> Message
          </Button>
          <Button
            asChild
            className="flex-1 md:flex-none bg-primary text-on-primary font-label-md shadow-sm"
          >
            <Link href={`/appointments?book=true&doctorId=${doctor.id}`}>
              <CalendarPlus className="w-4 h-4 mr-1.5" /> Book Consultation
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
              className={`px-2 py-3 border-b-2 font-label-md text-label-md font-semibold transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 1: Summary */}
      {activeTab === "summary" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
          <div className="md:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg space-y-md shadow-sm">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">About</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Dr. {doctor.full_name?.replace(/^Dr\.\s*/i, "")} is a recognized medical professional in {doctor.specialty || "General Medicine"}. Dedicated to quality diagnosis, compassionate patient care, and collaborative treatment plans at MedFlow Clinic.
            </p>
            <div className="pt-sm border-t border-outline-variant flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-surface-container-low text-on-surface text-label-sm border border-outline-variant">
                Consultation
              </span>
              <span className="px-3 py-1 rounded-full bg-surface-container-low text-on-surface text-label-sm border border-outline-variant">
                Diagnostic Review
              </span>
              <span className="px-3 py-1 rounded-full bg-surface-container-low text-on-surface text-label-sm border border-outline-variant">
                Patient Follow-up
              </span>
            </div>
          </div>

          <div className="md:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg space-y-md shadow-sm">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Practice Details</h2>
            <div className="space-y-sm text-body-sm">
              <div>
                <span className="text-label-sm text-on-surface-variant block">Consultation Room</span>
                <span className="font-semibold text-on-surface flex items-center gap-1.5 mt-0.5">
                  <DoorOpen className="w-4 h-4 text-primary" /> Room 204
                </span>
              </div>
              <div>
                <span className="text-label-sm text-on-surface-variant block">Direct Telephone</span>
                <span className="font-semibold text-on-surface flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-4 h-4 text-on-surface-variant" /> {doctor.phone || "+91 98201 54321"}
                </span>
              </div>
              <div>
                <span className="text-label-sm text-on-surface-variant block">Email Contact</span>
                <span className="font-semibold text-on-surface flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-4 h-4 text-on-surface-variant" /> {doctorEmail}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Schedule */}
      {activeTab === "schedule" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="p-md border-b border-outline-variant flex justify-between items-center">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Appointments Schedule</h2>
            <span className="text-label-sm text-on-surface-variant">{appointments.length} Total</span>
          </div>
          {appointments.length > 0 ? (
            <div className="divide-y divide-outline-variant">
              {appointments.map((appt) => (
                <div key={appt.id} className="p-md flex items-center justify-between hover:bg-surface-container-low transition-colors">
                  <div>
                    <div className="font-semibold text-on-surface">{appt.patients?.full_name || "Anonymous Patient"}</div>
                    <div className="text-on-surface-variant text-label-sm flex items-center gap-2 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(appt.start_time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      <span>&bull;</span>
                      <span>{appt.reason || "Consultation"}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-label-sm font-semibold bg-primary-container/20 text-primary border border-primary-container/50">
                    {appt.status || "Scheduled"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-on-surface-variant">No appointments scheduled for this doctor.</div>
          )}
        </div>
      )}

      {/* Tab 3: Patients */}
      {activeTab === "patients" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="p-md border-b border-outline-variant flex justify-between items-center">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Assigned Patients</h2>
            <span className="text-label-sm text-on-surface-variant">{patients.length} Patients</span>
          </div>
          {patients.length > 0 ? (
            <div className="divide-y divide-outline-variant">
              {patients.map((p) => (
                <div key={p.id} className="p-md flex items-center justify-between hover:bg-surface-container-low transition-colors">
                  <div className="flex items-center gap-md">
                    <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-xs">
                      {p.full_name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-on-surface">{p.full_name}</div>
                      <div className="text-on-surface-variant text-label-sm">{p.phone}</div>
                    </div>
                  </div>
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/patients/${p.id}`}>View Record</Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-on-surface-variant">No patient history recorded under this physician.</div>
          )}
        </div>
      )}

      {/* Tab 4: Professional Info */}
      {activeTab === "professional" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg space-y-md shadow-sm">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Medical Accreditation &amp; Licensing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md text-body-sm">
            <div className="p-md rounded-lg bg-surface-container-low border border-outline-variant">
              <span className="font-label-sm text-label-sm text-on-surface-variant block">State Medical Council Registration</span>
              <span className="font-semibold text-on-surface text-body-md mt-1 block">{doctor.license_no || "KMC-99214"}</span>
            </div>
            <div className="p-md rounded-lg bg-surface-container-low border border-outline-variant">
              <span className="font-label-sm text-label-sm text-on-surface-variant block">Board Certification</span>
              <span className="font-semibold text-on-surface text-body-md mt-1 block">Diplomate of National Board (DNB)</span>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {isMessageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/25 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg w-full max-w-md p-lg space-y-md">
            <div className="flex items-center justify-between border-b border-outline-variant pb-sm">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                Contact Dr. {doctor.full_name?.replace(/^Dr\.\s*/i, "")}
              </h3>
              <button onClick={() => setIsMessageOpen(false)}>
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-sm">
              <a
                href={`mailto:${doctorEmail}?subject=MedFlow%20Staff%20Inquiry`}
                className="p-sm rounded-lg border border-outline-variant bg-surface-container-low hover:bg-surface-container text-center flex flex-col items-center gap-1"
              >
                <Mail className="w-4 h-4 text-primary" />
                <span className="font-label-sm text-label-sm font-semibold text-on-surface">Email</span>
              </a>
              <a
                href={`tel:${doctor.phone}`}
                className="p-sm rounded-lg border border-outline-variant bg-surface-container-low hover:bg-surface-container text-center flex flex-col items-center gap-1"
              >
                <Phone className="w-4 h-4 text-secondary" />
                <span className="font-label-sm text-label-sm font-semibold text-on-surface">Call Staff</span>
              </a>
            </div>

            <form onSubmit={handleSendNote} className="space-y-sm">
              <label className="block font-label-sm text-label-sm text-on-surface-variant">Send Internal Memo</label>
              <textarea
                rows={3}
                required
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Type internal clinical note..."
                className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none focus:border-primary"
              />
              <div className="flex justify-end gap-sm">
                <Button type="button" variant="secondary" onClick={() => setIsMessageOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary text-on-primary">
                  {noteSent ? "Memo Dispatched" : "Send Memo"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
