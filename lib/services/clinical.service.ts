// ─── Clinical Service ────────────────────────────────────────────────────────
// Encapsulates patient and prescription queries behind typed, injectable
// functions. Follows the same dependency-injection pattern as the other
// services — the caller passes an authenticated Supabase client.
// ──────────────────────────────────────────────────────────────────────────────

import { DatabaseError } from "@/lib/errors";
import {
  createPatientSchema,
  createPrescriptionSchema,
  type CreatePatientPayload,
  type CreatePrescriptionPayload,
} from "@/lib/validators";
import type { PatientDetail, PatientSummary, PrescriptionSummary, SupabaseClient } from "./types";

// ── Patients ─────────────────────────────────────────────────────────────────

/**
 * List all patients for a clinic, alphabetically by name.
 * Returns an empty array (never throws) when there are no patients.
 */
export async function getPatients(
  client: SupabaseClient,
  clinicId: string,
  opts: { limit?: number; search?: string } = {},
): Promise<PatientSummary[]> {
  const { limit = 200, search } = opts;

  let query = client
    .from("patients")
    .select("id, full_name, dob, phone, email, blood_group, allergies, created_at")
    .eq("clinic_id", clinicId)
    .order("full_name")
    .limit(limit);

  if (search) {
    query = query.ilike("full_name", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new DatabaseError("Failed to load patients.", { cause: error });
  }

  return (data ?? []) as PatientSummary[];
}

/**
 * Fetch a single patient by id including full detail.
 * Throws DatabaseError on query failure; returns null when not found.
 */
export async function getPatientById(
  client: SupabaseClient,
  patientId: string,
): Promise<PatientDetail | null> {
  const { data, error } = await client
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new DatabaseError("Failed to load patient.", { cause: error });
  }

  return data as PatientDetail;
}

/**
 * Create a new patient. Validates the payload before writing.
 * Returns the new patient id.
 */
export async function createPatient(
  client: SupabaseClient,
  clinicId: string,
  payload: CreatePatientPayload,
  createdBy: string | null,
): Promise<string> {
  const parsed = createPatientSchema.parse(payload);

  const { data: inserted, error } = await client
    .from("patients")
    .insert({
      clinic_id: clinicId,
      full_name: parsed.full_name,
      dob: parsed.dob || null,
      sex: parsed.gender ? (parsed.gender as any) : null,
      phone: parsed.phone || null,
      email: parsed.email || null,
      address: parsed.address || null,
      blood_group: parsed.blood_group || null,
      allergies: parsed.allergies || null,
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new DatabaseError("Failed to create patient.", { cause: error });
  }

  return inserted.id;
}

// ── Prescriptions ────────────────────────────────────────────────────────────

/**
 * List prescriptions for a patient (or all, when patientId omitted),
 * newest first, with patient/doctor names joined.
 * Returns an empty array when there are no prescriptions.
 */
export async function getPrescriptions(
  client: SupabaseClient,
  clinicId: string,
  opts: { patientId?: string; limit?: number } = {},
): Promise<PrescriptionSummary[]> {
  const { patientId, limit = 50 } = opts;

  let query = client
    .from("prescriptions")
    .select(`
      id,
      patient_id,
      doctor_id,
      diagnosis,
      notes,
      status,
      created_at,
      patients ( full_name ),
      profiles!prescriptions_doctor_id_fkey ( full_name )
    `)
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (patientId) {
    query = query.eq("patient_id", patientId);
  }

  const { data, error } = await query;

  if (error) {
    throw new DatabaseError("Failed to load prescriptions.", { cause: error });
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    patient_id: row.patient_id,
    doctor_id: row.doctor_id,
    diagnosis: row.diagnosis,
    notes: row.notes,
    status: row.status,
    created_at: row.created_at,
    patient_name: row.patients?.full_name ?? null,
    doctor_name: row.profiles?.full_name ?? null,
  }));
}


/**
 * Fetch a single prescription with its items.
 * Throws DatabaseError on query failure; returns null when not found.
 */
export async function getPrescriptionById(
  client: SupabaseClient,
  prescriptionId: string,
): Promise<(PrescriptionSummary & { items: { id: string; drug_name: string; dosage: string | null; frequency: string | null; duration: string | null; instructions: string | null }[] }) | null> {
  const { data, error } = await client
    .from("prescriptions")
    .select(`
      id,
      patient_id,
      doctor_id,
      diagnosis,
      notes,
      status,
      created_at,
      patients ( full_name ),
      profiles!prescriptions_doctor_id_fkey ( full_name )
    `)
    .eq("id", prescriptionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new DatabaseError("Failed to load prescription.", { cause: error });
  }

  const row: any = data;

  const { data: items, error: itemsError } = await client
    .from("prescription_items")
    .select("id, drug_name, dosage, frequency, duration, instructions")
    .eq("prescription_id", prescriptionId);

  if (itemsError) {
    throw new DatabaseError("Failed to load prescription items.", { cause: itemsError });
  }

  return {
    id: row.id,
    patient_id: row.patient_id,
    doctor_id: row.doctor_id,
    diagnosis: row.diagnosis,
    notes: row.notes,
    status: row.status,
    created_at: row.created_at,
    patient_name: row.patients?.full_name ?? null,
    doctor_name: row.profiles?.full_name ?? null,
    items: items ?? [],
  };
}

/**
 * Create a new prescription with its line items.
 * Validates the payload with createPrescriptionSchema before writing.
 * Returns the new prescription id.
 */
export async function createPrescription(
  client: SupabaseClient,
  clinicId: string,
  payload: CreatePrescriptionPayload,
): Promise<string> {
  const parsed = createPrescriptionSchema.parse(payload);

  const { data: inserted, error } = await client
    .from("prescriptions")
    .insert({
      clinic_id: clinicId,
      patient_id: parsed.patient_id,
      doctor_id: parsed.doctor_id,
      appointment_id: parsed.appointment_id || null,
      diagnosis: parsed.diagnosis || null,
      notes: parsed.notes || null,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new DatabaseError("Failed to create prescription.", { cause: error });
  }

  for (const item of parsed.items) {
    const { error: itemError } = await client.from("prescription_items").insert({
      prescription_id: inserted.id,
      drug_name: item.drug_name,
      dosage: item.dosage || null,
      frequency: item.frequency || null,
      duration: item.duration || null,
      instructions: item.instructions || null,
    });
    if (itemError) {
      throw new DatabaseError("Prescription created but items failed.", { cause: itemError });
    }
  }

  return inserted.id;
}

