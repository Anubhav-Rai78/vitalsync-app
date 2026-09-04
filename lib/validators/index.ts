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

// ── Auth ─────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().min(1, "Enter your email address.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export type LoginPayload = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z.string().min(2, "Full name is required."),
  clinicName: z.string().optional(),
  workEmail: z.string().min(1, "Work email is required.").email("Enter a valid email address."),
  phoneNumber: z.string().optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string().min(1, "Please confirm your password."),
  terms: z
    .boolean()
    .refine((v) => v === true, {
      message: "You need to agree to the Terms of Service to continue.",
    }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});

export type RegisterPayload = z.infer<typeof registerSchema>;

// ── Record Vitals ────────────────────────────────────────────────────────

export const recordVitalsSchema = z.object({
  systolic: z.number().nullable(),
  diastolic: z.number().nullable(),
  heartRate: z.number().nullable(),
  weight: z.number().nullable(),
  temperature: z.number().nullable(),
  spo2: z.number().nullable(),
}).refine(
  (data) =>
    data.systolic !== null ||
    data.diastolic !== null ||
    data.heartRate !== null ||
    data.weight !== null ||
    data.temperature !== null ||
    data.spo2 !== null,
  { message: "Enter at least one vital reading." }
);

export type RecordVitalsPayload = z.infer<typeof recordVitalsSchema>;

// ── Doctor creation ──────────────────────────────────────────────────────

export const createDoctorSchema = z.object({
  fullName: z.string().min(2, "Full name is required."),
  specialty: z.string().optional(),
  licenseNo: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email address.").optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type CreateDoctorPayload = z.infer<typeof createDoctorSchema>;

// ── Appointment status ───────────────────────────────────────────────────

export const appointmentStatusSchema = z.object({
  appointmentId: z.string().uuid(),
  newStatus: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"]),
});

// ── Availability ─────────────────────────────────────────────────────────

const daySlotSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  available: z.boolean(),
});

export const availabilitySchema = z.object({
  doctorId: z.string().uuid(),
  days: z.array(daySlotSchema).length(7),
}).refine(
  (data) => data.days.some((d) => d.available),
  { message: "Enable at least one day with a time range." }
);

// ── Scaling mode ─────────────────────────────────────────────────────────

export const scalingModeSchema = z.enum(["free", "notify", "auto"]);

// ── Staff role ───────────────────────────────────────────────────────────

export const staffRoleSchema = z.object({
  staffId: z.string().uuid(),
  role: z.enum(["admin", "doctor", "front_desk"]),
});

// ── Patient note ─────────────────────────────────────────────────────────

export const patientNoteSchema = z.object({
  patientId: z.string().uuid(),
  note: z.string().min(1, "Note cannot be empty."),
});

// ── Quick medication ─────────────────────────────────────────────────────

export const quickMedSchema = z.object({
  patientId: z.string().uuid(),
  drugName: z.string().min(1, "Drug name is required."),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  instructions: z.string().optional(),
});

// ── Invoice form (modal) ─────────────────────────────────────────────────

export const invoiceFormSchema = z.object({
  patientId: z.string().min(1, "Please select a patient."),
  services: z.string().default("Consultation & Clinical Services"),
  amount: z.number().positive("Amount must be greater than zero."),
  status: z.enum(["paid", "sent", "overdue", "draft"]).default("sent"),
});

export type InvoiceFormPayload = z.infer<typeof invoiceFormSchema>;

// ── Razorpay API ─────────────────────────────────────────────────────────

export const razorpayOrderSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID."),
});

export const razorpayVerifySchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID."),
  razorpay_order_id: z.string().min(1, "Order ID is required."),
  razorpay_payment_id: z.string().min(1, "Payment ID is required."),
  razorpay_signature: z.string().min(1, "Signature is required."),
});

// ── Mark notification ────────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Enter your email address.").email("Enter a valid email address."),
});

export type ForgotPasswordPayload = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type ResetPasswordPayload = z.infer<typeof resetPasswordSchema>;

export const markNotificationSchema = z.object({
  notificationId: z.string().uuid(),
});

// ── Support Tickets ──────────────────────────────────────────────────────

export const submitTicketSchema = z.object({
  category: z.enum(["general", "billing", "appointments", "ehr", "bug"]),
  severity: z.enum(["low", "medium", "critical"]),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters.")
    .max(2000, "Description must be under 2000 characters."),
});

export type SubmitTicketPayload = z.infer<typeof submitTicketSchema>;

export const updateTicketStatusSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
});

export type UpdateTicketStatusPayload = z.infer<typeof updateTicketStatusSchema>;
