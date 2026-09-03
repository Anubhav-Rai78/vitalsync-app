// ─── Scheduling Service ──────────────────────────────────────────────────────
// Encapsulates appointment queries and mutations behind typed, injectable
// functions. Handles slot-availability and temporal invariant validation
// before writing, mapping failures to DomainErrors.
// ──────────────────────────────────────────────────────────────────────────────

import { ConflictError, DatabaseError, InvariantViolationError } from "@/lib/errors";
import { bookAppointmentSchema, type BookAppointmentPayload } from "@/lib/validators";
import type { AppointmentStatus } from "@/lib/supabase/types";
import type { AppointmentSummary, AppointmentWithRelations, SupabaseClient } from "./types";

const APPOINTMENT_SELECT = `
  id,
  patient_id,
  doctor_id,
  start_time,
  end_time,
  status,
  reason,
  patients ( full_name ),
  profiles!appointments_doctor_id_fkey ( full_name )
`;

/**
 * List appointments for a clinic. Supports optional status filter and a date
 * window. Newest first. Returns an empty array (never throws) when there are
 * no appointments.
 */
export async function getAppointments(
  client: SupabaseClient,
  clinicId: string,
  opts: {
    status?: AppointmentStatus | AppointmentStatus[];
    from?: string;
    to?: string;
    limit?: number;
  } = {},
): Promise<AppointmentWithRelations[]> {
  const { status, from, to, limit = 100 } = opts;

  let query = client
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("clinic_id", clinicId)
    .order("start_time", { ascending: false })
    .limit(limit);

  if (status) {
    query = Array.isArray(status) ? query.in("status", status) : query.eq("status", status);
  }
  if (from) query = query.gte("start_time", from);
  if (to) query = query.lte("start_time", to);

  const { data, error } = await query;

  if (error) {
    throw new DatabaseError("Failed to load appointments.", { cause: error });
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    patient_id: row.patient_id,
    doctor_id: row.doctor_id,
    start_time: row.start_time,
    end_time: row.end_time,
    status: row.status,
    reason: row.reason,
    patient_name: row.patients?.full_name ?? null,
    doctor_name: row.profiles?.full_name ?? null,
  }));
}

/**
 * Fetch a single appointment by id.
 * Throws DatabaseError on query failure; returns null when not found.
 */
export async function getAppointmentById(
  client: SupabaseClient,
  appointmentId: string,
): Promise<AppointmentWithRelations | null> {
  const { data, error } = await client
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("id", appointmentId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new DatabaseError("Failed to load appointment.", { cause: error });
  }

  return {
    id: data.id,
    patient_id: data.patient_id,
    doctor_id: data.doctor_id,
    start_time: data.start_time,
    end_time: data.end_time,
    status: data.status,
    reason: data.reason,
    patient_name: (data as any).patients?.full_name ?? null,
    doctor_name: (data as any).profiles?.full_name ?? null,
  };
}

/**
 * Check whether a doctor already has an overlapping appointment at the
 * proposed window. Used by bookAppointment to prevent double-booking.
 */
export async function hasConflictingAppointment(
  client: SupabaseClient,
  clinicId: string,
  doctorId: string,
  start: Date,
  end: Date,
  excludeId?: string,
): Promise<boolean> {
  let query = client
    .from("appointments")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("doctor_id", doctorId)
    .in("status", ["scheduled", "confirmed"])
    .lte("start_time", end.toISOString())
    .gte("end_time", start.toISOString())
    .limit(1);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;

  if (error) {
    throw new DatabaseError("Failed to check slot availability.", { cause: error });
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Book a new appointment. Validates the payload, rejects conflicts with the
 * doctor's existing schedule, and rejects appointments in the past.
 * Returns the new appointment id.
 */
export async function bookAppointment(
  client: SupabaseClient,
  clinicId: string,
  userId: string,
  payload: BookAppointmentPayload,
): Promise<string> {
  const parsed = bookAppointmentSchema.parse(payload);

  const start = new Date(parsed.scheduled_at);
  if (isNaN(start.getTime())) {
    throw new InvariantViolationError("Invalid appointment date/time.");
  }

  const now = new Date();
  if (start < now) {
    throw new InvariantViolationError("Appointment cannot be in the past.");
  }

  const end = new Date(start.getTime() + parsed.duration_minutes * 60_000);

  const conflicting = await hasConflictingAppointment(
    client,
    clinicId,
    parsed.doctor_id,
    start,
    end,
  );

  if (conflicting) {
    throw new ConflictError("This doctor already has an appointment in that time slot.");
  }

  const { data: inserted, error } = await client
    .from("appointments")
    .insert({
      clinic_id: clinicId,
      patient_id: parsed.patient_id,
      doctor_id: parsed.doctor_id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      reason: parsed.reason || null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new DatabaseError("Failed to create appointment.", { cause: error });
  }

  return inserted.id;
}

/**
 * Update an appointment's status (confirm, cancel, complete, no-show).
 */
export async function updateAppointmentStatus(
  client: SupabaseClient,
  appointmentId: string,
  newStatus: AppointmentStatus,
): Promise<void> {
  const { error } = await client
    .from("appointments")
    .update({ status: newStatus })
    .eq("id", appointmentId);

  if (error) {
    throw new DatabaseError("Failed to update appointment status.", { cause: error });
  }
}

/**
 * Reschedule an appointment to a new start time, preserving its duration.
 */
export async function rescheduleAppointment(
  client: SupabaseClient,
  clinicId: string,
  appointmentId: string,
  newStartTime: string,
  reason?: string,
): Promise<void> {
  const { data: appt, error: fetchError } = await client
    .from("appointments")
    .select("start_time, end_time, notes")
    .eq("id", appointmentId)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      throw new DatabaseError("Appointment not found.", { cause: fetchError });
    }
    throw new DatabaseError("Failed to load appointment.", { cause: fetchError });
  }

  const start = new Date(newStartTime);
  if (isNaN(start.getTime())) {
    throw new InvariantViolationError("Invalid start time.");
  }

  const duration =
    new Date(appt.end_time).getTime() - new Date(appt.start_time).getTime();
  const end = new Date(start.getTime() + (Number.isFinite(duration) ? duration : 45 * 60_000));

  // Fetch doctor id for conflict check
  const { data: doctorRow } = await client
    .from("appointments")
    .select("doctor_id")
    .eq("id", appointmentId)
    .single();

  const conflicting = await hasConflictingAppointment(
    client,
    clinicId,
    doctorRow?.doctor_id as string,
    start,
    end,
    appointmentId,
  );
  if (conflicting) {
    throw new ConflictError("This doctor already has an appointment in that time slot.");
  }

  const notes = reason?.trim()
    ? `${reason.trim()}${appt.notes ? `\n${appt.notes}` : ""}`
    : appt.notes;

  const { error } = await client
    .from("appointments")
    .update({
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      notes,
      status: "confirmed",
    })
    .eq("id", appointmentId);

  if (error) {
    throw new DatabaseError("Failed to reschedule appointment.", { cause: error });
  }
}

export type { AppointmentSummary };
