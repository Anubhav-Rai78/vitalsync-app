"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUserFacingMessage } from "@/lib/errors";
import {
  createPatientSchema,
  quickMedSchema,
  patientNoteSchema,
  recordVitalsSchema,
} from "@/lib/validators";

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

  const parsed = createPatientSchema.safeParse({
    full_name: String(formData.get("fullName") || ""),
    dob: String(formData.get("dob") || ""),
    phone: String(formData.get("phone") || ""),
    email: String(formData.get("email") || ""),
    allergies: String(formData.get("allergies") || ""),
    blood_group: String(formData.get("bloodGroup") || ""),
    gender: String(formData.get("sex") || ""),
    address: String(formData.get("address") || ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { full_name, dob, phone, email, allergies, blood_group, gender, address } = parsed.data;

  const { data: inserted, error } = await supabase
    .from("patients")
    .insert({
      clinic_id: profile.clinic_id,
      full_name,
      dob: dob || null,
      sex: (gender || null) as any,
      phone: phone || null,
      email: email || null,
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

  if (error) return { error: getUserFacingMessage(error, "Failed to create patient.") };

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
  const parsed = quickMedSchema.safeParse({
    patientId,
    drugName: data.drugName,
    dosage: data.dosage ?? undefined,
    frequency: data.frequency ?? undefined,
    duration: data.duration ?? undefined,
    instructions: data.instructions ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { patientId: pId, drugName, dosage, frequency, duration, instructions } = parsed.data;

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
      patient_id: pId,
      doctor_id: user.id,
      diagnosis: drugName,
      notes: instructions || null,
    })
    .select("id")
    .single();

  if (rxErr || !rx) return { error: getUserFacingMessage(rxErr, "Failed to create prescription.") };

  // Insert the prescription item
  const { error: itemErr } = await admin.from("prescription_items").insert({
    prescription_id: rx.id,
    drug_name: drugName,
    dosage: dosage || null,
    frequency: frequency || null,
    duration: duration || null,
    instructions: instructions || null,
  });

  if (itemErr) return { error: getUserFacingMessage(itemErr, "Failed to save medication.") };

  revalidatePath(`/patients/${pId}`);
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
  const parsed = patientNoteSchema.safeParse({ patientId, note });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { patientId: pId, note: trimmedNote } = parsed.data;

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
    entity_id: pId,
    metadata: { note: trimmedNote, author: profile.full_name },
  });

  if (error) return { error: getUserFacingMessage(error, "Failed to save note.") };

  revalidatePath(`/patients/${pId}`);
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

  const vitals = recordVitalsSchema.safeParse({
    systolic: toNum("systolic"),
    diastolic: toNum("diastolic"),
    heartRate: toNum("heartRate"),
    weight: toNum("weight"),
    temperature: toNum("temperature"),
    spo2: toNum("spo2"),
  });
  if (!vitals.success) {
    return { error: vitals.error.issues[0]?.message ?? "Invalid input." };
  }

  const { systolic, diastolic, heartRate, weight, temperature, spo2 } = vitals.data;

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

  if (error) return { error: getUserFacingMessage(error, "Failed to record vitals.") };

  revalidatePath(`/patients/${patientId}`);
  return { error: null };
}
