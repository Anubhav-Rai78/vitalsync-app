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
