"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AvailabilityFormState = { error: string | null };

// Upserts one `doctor_availability` row per day of week (0=Sun .. 6=Sat)
// from the form's `start_{i}` / `end_{i}` fields. Only the doctor on their
// own profile — or an admin — may edit.
export async function updateAvailabilityAction(
  doctorId: string,
  formData: FormData
): Promise<AvailabilityFormState> {
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
  if (!profile) return { error: "Could not resolve your clinic. Try signing in again." };

  const isOwner = user.id === doctorId;
  const isAdmin = profile.role === "admin";
  if (!isOwner && !isAdmin) {
    return { error: "Only the doctor or an admin can edit availability." };
  }

  const rows = Array.from({ length: 7 }, (_, day) => {
    const start = String(formData.get(`start_${day}`) || "").trim();
    const end = String(formData.get(`end_${day}`) || "").trim();
    const available = formData.get(`available_${day}`) === "on";
    return { day_of_week: day, start_time: start || null, end_time: end || null, available };
  });

  const inserts = rows
    .filter((r) => r.available)
    .map((r) => ({
      clinic_id: profile.clinic_id,
      doctor_id: doctorId,
      day_of_week: r.day_of_week,
      start_time: r.start_time ?? "09:00",
      end_time: r.end_time ?? "17:00",
      is_available: true,
    }));

  if (inserts.length === 0) {
    return { error: "Enable at least one day with a time range." };
  }

  // Upsert all 7 rows (disabled days become is_available = false so the
  // profile page can still render their stored times when re-enabled).
  const allRows = rows.map((r) => ({
    clinic_id: profile.clinic_id,
    doctor_id: doctorId,
    day_of_week: r.day_of_week,
    start_time: r.start_time ?? "09:00",
    end_time: r.end_time ?? "17:00",
    is_available: r.available,
  }));

  const { error } = await supabase
    .from("doctor_availability")
    .upsert(allRows, { onConflict: "doctor_id,day_of_week" });

  if (error) return { error: error.message };

  revalidatePath(`/doctors/${doctorId}`);
  return { error: null };
}