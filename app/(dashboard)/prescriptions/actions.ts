"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserFacingMessage } from "@/lib/errors";

export type RxStatus = "active" | "draft" | "completed" | "discontinued";

export interface PrescriptionItemInput {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string;
  refills?: number;
  instructions?: string;
}

export interface CreatePrescriptionPayload {
  patientId: string;
  appointmentId?: string;
  diagnosis?: string;
  notes?: string;
  status?: RxStatus;
  items: PrescriptionItemInput[];
}

export type CreatePrescriptionResult =
  | { success: true; prescriptionId: string }
  | { error: string };

// The medication page links straight to /prescriptions/new?patientId=&renew=.
// `renew` notes the source prescription being renewed (used for traceability
// only), while `status` lets the builder save drafts or finalize a script.
export async function createPrescriptionAction(
  payload: CreatePrescriptionPayload
): Promise<CreatePrescriptionResult> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Authentication required." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id, role")
      .eq("id", user.id)
      .single();

    // If the profile's clinic_id is missing/unset, fall back to the shared
    // default clinic so prescription creation doesn't hard-crash. The RLS
    // policies key off current_clinic_id() (which reads profiles.clinic_id),
    // so a missing clinic context here would otherwise cause the insert to be
    // silently blocked by row-level security.
    const clinicId =
      profile?.clinic_id || "11111111-1111-1111-1111-111111111111";
    if (!profile) {
      return { error: "Profile not found. Cannot determine clinic context." };
    }

    // middleware.ts already gates this route to doctor/admin/front_desk, but we
    // still enforce a clinically-sensible allow-list server-side.
    const allowedRoles = ["doctor", "admin", "front_desk"];
    if (!allowedRoles.includes(profile.role)) {
      return { error: "You do not have permission to write prescriptions." };
    }

    const patientId = payload.patientId?.trim();
    if (!patientId) return { error: "Please select a patient." };

    // ── Resolve a valid doctor_id ───────────────────────────────────────
    // The prescriptions table has a foreign key on doctor_id → profiles.id
    // and the original RLS policy expected doctor_id = auth.uid().
    // When an admin or front-desk staff creates a prescription on behalf of
    // a doctor we must look up an actual doctor in the same clinic.
    let assignedDoctorId = user.id;

    if (profile.role !== "doctor") {
      // Try the appointment's doctor first (if an appointment was linked)
      if (payload.appointmentId?.trim()) {
        const { data: appt } = await supabase
          .from("appointments")
          .select("doctor_id")
          .eq("id", payload.appointmentId.trim())
          .maybeSingle();
        if (appt?.doctor_id) assignedDoctorId = appt.doctor_id;
      }

      // Fallback: pick the first active doctor in the same clinic
      if (assignedDoctorId === user.id) {
        const { data: fallbackDoc } = await supabase
          .from("profiles")
          .select("id")
          .eq("clinic_id", clinicId)
          .eq("role", "doctor")
          .limit(1)
          .maybeSingle();
        if (fallbackDoc) assignedDoctorId = fallbackDoc.id;
      }

      // If we still can't find any doctor, the insert will fail with a
      // meaningful FK error — but we surface a friendlier message.
      if (assignedDoctorId === user.id) {
        return {
          error: "No doctor found in your clinic to assign this prescription to. Please add a doctor profile first.",
        };
      }
    }

    const items = (payload.items ?? [])
      .map((item) => ({
        prescription_id: "" as string, // set after insert
        drug_name: item.drugName?.trim(),
        dosage: item.dosage?.trim() || null,
        frequency: item.frequency?.trim() || null,
        duration: item.duration?.trim() || null,
        instructions: item.instructions?.trim() || null,
        route: item.route?.trim() || null,
        refills: Number.isFinite(item.refills) ? Math.max(0, Math.floor(item.refills!)) : 0,
      }))
      .filter((item) => item.drug_name);

    if (items.length === 0) {
      return { error: "Add at least one medication with a drug name." };
    }

    const status: RxStatus =
      payload.status === "draft" ||
        payload.status === "completed" ||
        payload.status === "discontinued"
        ? payload.status
        : "active";

    const { data: rx, error: rxError } = await supabase
      .from("prescriptions")
      .insert({
        clinic_id: clinicId,
        patient_id: patientId,
        doctor_id: assignedDoctorId,
        appointment_id: payload.appointmentId?.trim() || null,
        diagnosis: payload.diagnosis?.trim() || "General Consultation",
        notes: payload.notes?.trim() || null,
        status,
      })
      .select("id")
      .single();

    if (rxError || !rx) {
      const msg = getUserFacingMessage(rxError, "Failed to create prescription.");
      // Surface RLS permission errors explicitly so debugging is immediate.
      if (/row-level security/i.test(msg)) {
        return {
          error:
            "Permission denied by the database (RLS). Check that the signed-in profile has a clinic_id and that migration 0008 has been applied (active role must be doctor/admin/front_desk).",
        };
      }
      return { error: msg };
    }

    const rows = items.map((item) => ({ ...item, prescription_id: rx.id }));
    const { error: itemsError } = await supabase
      .from("prescription_items")
      .insert(rows);

    if (itemsError) {
      const itemsMsg = getUserFacingMessage(itemsError, "Failed to save medication line items.");
      if (/row-level security/i.test(itemsMsg)) {
        return {
          error:
            "Permission denied saving medication line items (RLS). Confirm migration 0008 is applied and your profile clinic_id is set.",
        };
      }
      return { error: itemsMsg };
    }

    revalidatePath("/prescriptions");
    revalidatePath(`/patients/${patientId}`);
    return { success: true, prescriptionId: rx.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create prescription.";
    return { error: message };
  }
}

