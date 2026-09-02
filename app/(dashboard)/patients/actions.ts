"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export type PatientFormState = { error: string | null };

export async function createPatientAction(
  _prevState: PatientFormState,
  formData: FormData
): Promise<PatientFormState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Could not resolve your clinic. Try signing in again." };

  const fullName = String(formData.get("fullName") || "");
  if (!fullName) return { error: "Full name is required." };

  const { data: inserted, error } = await supabase
    .from("patients")
    .insert({
      clinic_id: profile.clinic_id,
      full_name: fullName,
      dob: String(formData.get("dob") || "") || null,
      sex: (String(formData.get("sex") || "") || null) as any,
      phone: String(formData.get("phone") || "") || null,
      email: String(formData.get("email") || "") || null,
      address: [formData.get("address"), formData.get("city"), formData.get("zip")]
        .filter(Boolean)
        .join(", "),
      emergency_contact: [formData.get("emergencyName"), formData.get("emergencyPhone")]
        .filter(Boolean)
        .join(" — "),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/patients");
  redirect(`/patients/${inserted.id}`);
}

// ──────────────────────────────────────────────────────────────
// Quick Add Medication (admin bypass for RLS)
// ──────────────────────────────────────────────────────────────
export type QuickMedState = { error: string | null; prescriptionId?: string };

export async function addQuickMedicationAction(
  patientId: string,
  data: {
    drugName: string;
    dosage?: string | null;
    frequency?: string | null;
    duration?: string | null;
    instructions?: string | null;
  }
): Promise<QuickMedState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id, full_name")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Could not resolve your clinic." };

  // Use admin client to bypass RLS — admins create prescriptions on behalf of doctors.
  const admin = createAdminClient();

  // Create a draft prescription for this patient
  const { data: rx, error: rxErr } = await admin
    .from("prescriptions")
    .insert({
      clinic_id: profile.clinic_id,
      patient_id: patientId,
      doctor_id: user.id,
      diagnosis: data.drugName,
      notes: data.instructions || null,
    })
    .select("id")
    .single();

  if (rxErr || !rx) return { error: rxErr?.message ?? "Failed to create prescription." };

  // Insert the prescription item
  const { error: itemErr } = await admin.from("prescription_items").insert({
    prescription_id: rx.id,
    drug_name: data.drugName,
    dosage: data.dosage || null,
    frequency: data.frequency || null,
    duration: data.duration || null,
    instructions: data.instructions || null,
  });

  if (itemErr) return { error: itemErr.message };

  revalidatePath(`/patients/${patientId}`);
  return { error: null, prescriptionId: rx.id };
}

// ──────────────────────────────────────────────────────────────
// Save Patient Internal Note (via audit_logs)
// ──────────────────────────────────────────────────────────────
export type PatientNoteState = { error: string | null };

export async function savePatientNoteAction(
  patientId: string,
  note: string
): Promise<PatientNoteState> {
  if (!note.trim()) return { error: "Note cannot be empty." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id, full_name")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Could not resolve your clinic." };

  const { error } = await supabase.from("audit_logs").insert({
    clinic_id: profile.clinic_id,
    actor_id: user.id,
    action: "patient_note_added",
    entity_type: "patients",
    entity_id: patientId,
    metadata: { note: note.trim(), author: profile.full_name },
  });

  if (error) return { error: error.message };

  revalidatePath(`/patients/${patientId}`);
  return { error: null };
}

export type VitalsFormState = { error: string | null };

export async function recordVitalsAction(patientId: string, formData: FormData): Promise<VitalsFormState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Could not resolve your clinic. Try signing in again." };

  const toNum = (key: string): number | null => {
    const raw = String(formData.get(key) || "").trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const systolic = toNum("systolic");
  const diastolic = toNum("diastolic");
  const heartRate = toNum("heartRate");
  const weight = toNum("weight");
  const temperature = toNum("temperature");
  const spo2 = toNum("spo2");

  if (systolic === null && diastolic === null && heartRate === null && weight === null && temperature === null && spo2 === null) {
    return { error: "Enter at least one vital reading." };
  }

  const { error } = await supabase.from("vitals").insert({
    clinic_id: profile.clinic_id,
    patient_id: patientId,
    recorded_by: user.id,
    blood_pressure_systolic: systolic,
    blood_pressure_diastolic: diastolic,
    heart_rate: heartRate,
    weight_kg: weight,
    temperature_c: temperature,
    spo2: spo2,
  });

  if (error) return { error: error.message };

  revalidatePath(`/patients/${patientId}`);
  return { error: null };
}
