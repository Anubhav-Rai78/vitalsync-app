"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
