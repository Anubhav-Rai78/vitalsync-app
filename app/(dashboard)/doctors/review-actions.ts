"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserFacingMessage } from "@/lib/errors";
import { doctorReviewSchema } from "@/lib/validators";

// ── Types ──────────────────────────────────────────────────────────────────

export type ReviewFormState = {
  success: boolean;
  error: string | null;
};

// ── Submit a Doctor Review ─────────────────────────────────────────────────

/**
 * Server Action to submit a patient review for a doctor.
 * Only usable when `FEATURE_FLAGS.USE_REAL_RATINGS = true` and the
 * `doctor_reviews` table has been migrated into the database.
 */
export async function submitDoctorReviewAction(
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in to submit a review." };
  }

  const parsed = doctorReviewSchema.safeParse({
    doctorId: formData.get("doctorId"),
    patientId: formData.get("patientId"),
    appointmentId: formData.get("appointmentId") || undefined,
    rating: Number(formData.get("rating")),
    feedback: formData.get("feedback") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid review payload.",
    };
  }

  // Resolve the doctor's clinic for tenant isolation.
  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", parsed.data.doctorId)
    .single();

  if (!profile?.clinic_id) {
    return { success: false, error: "Doctor not found." };
  }

  const { error } = await supabase.from("doctor_reviews").insert({
    clinic_id: profile.clinic_id,
    doctor_id: parsed.data.doctorId,
    patient_id: parsed.data.patientId,
    appointment_id: parsed.data.appointmentId ?? null,
    rating: parsed.data.rating,
    feedback: parsed.data.feedback ?? null,
  });

  if (error) {
    return { success: false, error: getUserFacingMessage(error) };
  }

  revalidatePath("/reports");
  revalidatePath("/doctors");
  return { success: true, error: null };
}
