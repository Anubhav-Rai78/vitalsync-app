// ─── Shared Service Types ────────────────────────────────────────────────────
// Common types returned by the VitalSync service layer. These are deliberately
// framework-agnostic so services can be consumed from both Server Actions and
// client-side components without importing React or Supabase types.
// ──────────────────────────────────────────────────────────────────────────────

import type { Database, AppointmentStatus } from "@/lib/supabase/types";

/** A Supabase authenticated client (either server or browser). */
export type SupabaseClient = import("@supabase/supabase-js").SupabaseClient<Database>;

// ── Patient ──────────────────────────────────────────────────────────────────

export interface PatientSummary {
  id: string;
  full_name: string;
  dob: string | null;
  phone: string | null;
  email: string | null;
  blood_group: string | null;
  allergies: string | null;
  created_at: string;
}

export interface PatientDetail extends PatientSummary {
  clinic_id: string;
  sex: "male" | "female" | "other" | null;
  address: string | null;
  emergency_contact: string | null;
  created_by: string | null;
}

// ── Appointment ──────────────────────────────────────────────────────────────

export interface AppointmentSummary {
  id: string;
  patient_id: string;
  doctor_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  reason: string | null;
}

export interface AppointmentWithRelations extends AppointmentSummary {
  patient_name?: string | null;
  doctor_name?: string | null;
}

// ── Invoice ──────────────────────────────────────────────────────────────────

export interface InvoiceWithPatient {
  id: string;
  invoice_number: string;
  status: "draft" | "sent" | "paid" | "overdue" | "void";
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  due_date: string | null;
  created_at: string;
  patient_name?: string | null;
}

// ── Prescription ─────────────────────────────────────────────────────────────

export interface PrescriptionSummary {
  id: string;
  patient_id: string;
  doctor_id: string;
  diagnosis: string | null;
  notes: string | null;
  status: "active" | "draft" | "completed" | "discontinued";
  created_at: string;
  patient_name?: string | null;
  doctor_name?: string | null;
}

// ── Reports ──────────────────────────────────────────────────────────────────

export interface RevenueRow {
  month: string;
  revenue: number;
  invoices: number;
}

export interface DashboardStats {
  totalPatients: number;
  totalAppointments: number;
  upcomingAppointments: number;
  pendingInvoices: number;
  monthlyRevenue: number;
}

/** Empty-state fallback returned by services when no data exists. */
export const EMPTY_DASHBOARD_STATS: DashboardStats = {
  totalPatients: 0,
  totalAppointments: 0,
  upcomingAppointments: 0,
  pendingInvoices: 0,
  monthlyRevenue: 0,
};
