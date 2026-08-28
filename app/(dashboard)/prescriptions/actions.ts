"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type PrescriptionFormState = { error: string | null };

export async function createPrescriptionAction(
  _prevState: PrescriptionFormState,
  formData: FormData
): Promise<PrescriptionFormState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Could not resolve your clinic." };
  if (profile.role !== "doctor") return { error: "Only doctors can write prescriptions." };

  const patientId = String(formData.get("patientId") || "");
  const diagnosis = String(formData.get("diagnosis") || "");
  if (!patientId) return { error: "Select a patient." };

  const drugNames = formData.getAll("drugName") as string[];
  const dosages = formData.getAll("dosage") as string[];
  const frequencies = formData.getAll("frequency") as string[];
  const durations = formData.getAll("duration") as string[];
  const instructions = formData.getAll("instructions") as string[];

  const { data: prescription, error } = await supabase
    .from("prescriptions")
    .insert({
      clinic_id: profile.clinic_id,
      patient_id: patientId,
      doctor_id: user.id,
      diagnosis: diagnosis || null,
      notes: String(formData.get("notes") || "") || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const items = drugNames
    .map((name, i) => ({
      prescription_id: prescription.id,
      drug_name: name,
      dosage: dosages[i] || null,
      frequency: frequencies[i] || null,
      duration: durations[i] || null,
      instructions: instructions[i] || null,
    }))
    .filter((item) => item.drug_name?.trim());

  if (items.length > 0) {
    const { error: itemsError } = await supabase.from("prescription_items").insert(items);
    if (itemsError) return { error: itemsError.message };
  }

  revalidatePath("/prescriptions");
  redirect(`/prescriptions/${prescription.id}`);
}
