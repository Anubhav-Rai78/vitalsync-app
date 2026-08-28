"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus } from "@/lib/supabase/types";

export type AppointmentFormState = { error: string | null };

export async function bookAppointmentAction(
  _prevState: AppointmentFormState,
  formData: FormData
): Promise<AppointmentFormState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("clinic_id").eq("id", user.id).single();
  if (!profile) return { error: "Could not resolve your clinic." };

  const patientId = String(formData.get("patientId") || "");
  const doctorId = String(formData.get("doctorId") || "");
  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "");
  const durationMinutes = Number(formData.get("duration") || 30);

  if (!patientId || !doctorId || !date || !time) {
    return { error: "Patient, doctor, date and time are all required." };
  }

  const start = new Date(`${date}T${time}`);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const { data: inserted, error } = await supabase
    .from("appointments")
    .insert({
      clinic_id: profile.clinic_id,
      patient_id: patientId,
      doctor_id: doctorId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      reason: String(formData.get("reason") || "") || null,
      notes: String(formData.get("notes") || "") || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/appointments");
  redirect(`/appointments/${inserted.id}`);
}

export async function updateAppointmentStatusAction(appointmentId: string, status: AppointmentStatus) {
  const supabase = createClient();
  await supabase.from("appointments").update({ status }).eq("id", appointmentId);
  revalidatePath(`/appointments/${appointmentId}`);
  revalidatePath("/appointments");
}
