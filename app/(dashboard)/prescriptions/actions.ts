"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
    if (!profile?.clinic_id) return { error: "Clinic context missing." };

    // middleware.ts already gates this route to doctor/admin/front_desk, but we
    // still enforce a clinically-sensible allow-list server-side.
    const allowedRoles = ["doctor", "admin", "front_desk"];
    if (!allowedRoles.includes(profile.role)) {
      return { error: "You do not have permission to write prescriptions." };
    }

    const patientId = payload.patientId?.trim();
    if (!patientId) return { error: "Please select a patient." };

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
        clinic_id: profile.clinic_id,
        patient_id: patientId,
        doctor_id: user.id,
        appointment_id: payload.appointmentId?.trim() || null,
        diagnosis: payload.diagnosis?.trim() || "General Consultation",
        notes: payload.notes?.trim() || null,
        status,
      })
      .select("id")
      .single();

    if (rxError || !rx) {
      return { error: rxError?.message || "Failed to create prescription." };
    }

    const rows = items.map((item) => ({ ...item, prescription_id: rx.id }));
    const { error: itemsError } = await supabase
      .from("prescription_items")
      .insert(rows);

    if (itemsError) {
      return { error: itemsError.message || "Failed to save medication line items." };
    }

    revalidatePath("/prescriptions");
    revalidatePath(`/patients/${patientId}`);
    return { success: true, prescriptionId: rx.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create prescription.";
    return { error: message };
  }
}

