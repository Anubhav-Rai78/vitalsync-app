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

export type { AppointmentStatus } from "@/lib/supabase/types";

export async function updateAppointmentStatusAction(
  appointmentId: string,
  newStatus: AppointmentStatus
): Promise<{ success: true; newStatus: AppointmentStatus } | { error: string }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Authentication required." };

    if (!appointmentId) return { error: "Appointment id is required." };

    const { error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", appointmentId);

    if (error) {
      console.error("Status update error:", error);
      return { error: error.message };
    }

    // Clear server cache so the calendar, detail view, and dashboard update immediately
    revalidatePath("/appointments");
    revalidatePath(`/appointments/${appointmentId}`);
    revalidatePath("/dashboard");

    return { success: true, newStatus };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update appointment status.";
    return { error: message };
  }
}

export type AppointmentRescheduleState = { error: string | null };

export async function rescheduleAppointmentAction(
  appointmentId: string,
  startTime: string,
  reason?: string
): Promise<AppointmentRescheduleState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: appt } = await supabase
    .from("appointments")
    .select("start_time, end_time, notes")
    .eq("id", appointmentId)
    .single();

  if (!appt) return { error: "Appointment not found." };
  if (!startTime) return { error: "A new start time is required." };

  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) return { error: "Invalid start time." };

  const duration =
    new Date(appt.end_time).getTime() - new Date(appt.start_time).getTime();
  const end = new Date(start.getTime() + (Number.isFinite(duration) ? duration : 45 * 60000));

  const notes = reason?.trim()
    ? `${reason.trim()}${appt.notes ? `\n${appt.notes}` : ""}`
    : appt.notes;

  const { error } = await supabase
    .from("appointments")
    .update({
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      notes,
      status: "confirmed",
    })
    .eq("id", appointmentId);

  if (error) return { error: error.message };

  revalidatePath(`/appointments/${appointmentId}`);
  revalidatePath("/appointments");
  return { error: null };
}
