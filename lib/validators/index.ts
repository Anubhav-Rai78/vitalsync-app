// ─── Zod Validation Schemas ──────────────────────────────────────────────────
// Typed schemas for every mutation payload in the app. Inferred types are
// exported so actions, services, and future form-level validation can share
// a single source of truth.
//
// Dependency: zod (already in package.json)
// ──────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

// ── Helpers ──────────────────────────────────────────────────────────────────

const uuid = z.string().uuid();
const positiveInt = z.number().int().positive();
const optionalString = z.string().optional().or(z.literal(""));

// ── Invoice / Billing ────────────────────────────────────────────────────────

export const invoiceLineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: positiveInt.default(1),
  unit_price: z.number().positive("Unit price must be positive"),
});

export const createInvoiceSchema = z.object({
  patient_id: uuid,
  amount: z.number().positive("Amount must be positive"),
  line_items: z.array(invoiceLineItemSchema).optional().default([]),
  notes: optionalString,
  due_date: z.string().optional(), // ISO date string
});

export type CreateInvoicePayload = z.infer<typeof createInvoiceSchema>;

// ── Appointments / Scheduling ────────────────────────────────────────────────

export const bookAppointmentSchema = z.object({
  patient_id: uuid,
  doctor_id: uuid,
  scheduled_at: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Must be a valid ISO datetime"),
  duration_minutes: positiveInt.default(30),
  reason: optionalString,
});

export type BookAppointmentPayload = z.infer<typeof bookAppointmentSchema>;

// ── Patients ─────────────────────────────────────────────────────────────────

export const createPatientSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  dob: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Must be a valid date"),
  phone: optionalString,
  email: optionalString,
  allergies: optionalString,
  blood_group: optionalString,
  gender: z.string().optional(),
  address: optionalString,
});

export type CreatePatientPayload = z.infer<typeof createPatientSchema>;

// ── Prescriptions ────────────────────────────────────────────────────────────

export const prescriptionItemSchema = z.object({
  drug_name: z.string().min(1, "Drug name is required"),
  dosage: optionalString,
  frequency: optionalString,
  duration: optionalString,
  instructions: optionalString,
});

export const createPrescriptionSchema = z.object({
  patient_id: uuid,
  doctor_id: uuid,
  diagnosis: optionalString,
  notes: optionalString,
  appointment_id: uuid.optional().or(z.literal("")),
  items: z.array(prescriptionItemSchema).min(1, "At least one medication is required"),
});

export type CreatePrescriptionPayload = z.infer<typeof createPrescriptionSchema>;

// ── Reports ──────────────────────────────────────────────────────────────────

export const reportQuerySchema = z.object({
  type: z.enum(["revenue", "patient", "clinical", "operational"]),
  date_from: z.string().refine((val) => !isNaN(new Date(val).getTime()), "Invalid date"),
  date_to: z.string().refine((val) => !isNaN(new Date(val).getTime()), "Invalid date"),
  filters: z.record(z.string(), z.string()).optional(),
});

export type ReportQueryPayload = z.infer<typeof reportQuerySchema>;

// ── Profile ──────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: optionalString,
  specialisation: optionalString,
  license_no: optionalString,
  bio: optionalString,
});

export type UpdateProfilePayload = z.infer<typeof updateProfileSchema>;

// ── Settings ─────────────────────────────────────────────────────────────────

export const updateClinicSettingsSchema = z.object({
  name: z.string().min(1, "Clinic name is required"),
  address: optionalString,
  phone: optionalString,
  scaling_mode: z.enum(["free", "notify", "auto"]).optional(),
});

export type UpdateClinicSettingsPayload = z.infer<typeof updateClinicSettingsSchema>;
