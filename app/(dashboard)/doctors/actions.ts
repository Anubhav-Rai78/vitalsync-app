"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export type AvailabilityFormState = { error: string | null };

export type CreateDoctorFormState = { error: string | null };

// Resolves the signed-in admin's clinic (redirects to login if unauthenticated).
// Returns null when the caller is authenticated but not an admin; the callers
// that require admin privilege interpret that as a "forbidden" outcome.
async function requireAdmin() {
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
  if (!profile || profile.role !== "admin") return null;
  return { supabase, profile };
}

// Registers a new doctor on the clinic roster.
//
// Doctors are rows in `profiles` (role = 'doctor'). The `email` field is not
// persisted on profiles (that column doesn't exist in this schema — login
// identity lives in auth.users), so when the admin provides one we also create
// a matching auth.users row via the service-role client so the doctor can
// actually sign in. That mirrors how the demo seed (0006) stands up doctors.
//
// Creating the profile first also seeds default 7-day availability rows into
// `doctor_availability` (Mon–Fri 09:00–17:00) so the new doctor shows a usable
// weekly schedule on their profile immediately.
export async function createDoctorAction(
  _prevState: CreateDoctorFormState,
  formData: FormData
): Promise<CreateDoctorFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Only admins can add doctors." };

  const fullName = String(formData.get("fullName") || "").trim();
  if (!fullName) return { error: "Full name is required." };

  const specialty = String(formData.get("specialty") || "").trim() || null;
  const licenseNo = String(formData.get("licenseNo") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim().toLowerCase() || null;
  const isActive = formData.get("status") !== "inactive"; // "active" (default) | "inactive"

  const doctorId = randomUUID();

  // 1. Persist the roster profile (source of truth for the Doctors page).
  const { error: profileError } = await ctx.supabase.from("profiles").insert({
    id: doctorId,
    clinic_id: ctx.profile.clinic_id,
    full_name: fullName.replace(/^dr\.\s*/i, ""),
    role: "doctor",
    specialty,
    license_no: licenseNo,
    phone,
    is_active: isActive,
  });
  if (profileError) return { error: profileError.message };

  // 2. Seed default Mon–Fri availability so the doctor's schedule isn't empty.
  const availabilityRows = Array.from({ length: 7 }, (_, day) => ({
    clinic_id: ctx.profile.clinic_id,
    doctor_id: doctorId,
    day_of_week: day,
    start_time: "09:00",
    end_time: "17:00",
    is_available: day >= 1 && day <= 5, // Mon–Fri
  }));
  const { error: availError } = await ctx.supabase
    .from("doctor_availability")
    .insert(availabilityRows);
  if (availError) {
    // The profile already exists; surface the error so the admin can retry.
    return { error: availError.message };
  }

  // 3. Optionally create a matching auth user so the doctor can log in.
  if (email) {
    const admin = createAdminClient();
    const defaultPassword = `Medflow@${doctorId.slice(0, 8)}`;
    const { error: authError } = await admin.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.replace(/^dr\.\s*/i, ""),
        role: "doctor",
        specialty,
        phone,
      },
    });
    if (authError) {
      // The on_auth_user_created trigger would also create a profile for this
      // new user, but our roster profile above shares none of the auth ids, so
      // there is no conflict — just report the auth setup issue.
      return { error: `Doctor profile saved, but login setup failed: ${authError.message}` };
    }
  }

  revalidatePath("/doctors");
  redirect(`/doctors/${doctorId}`);
}

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