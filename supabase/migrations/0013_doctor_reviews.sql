-- VitalSync — Migration 0013: Doctor Reviews & Ratings
-- Provides the backend for a real patient review & rating system.
-- When FEATURE_FLAGS.USE_REAL_RATINGS is enabled, the UI surfaces live
-- patient ratings from this table instead of the operational dynamic score.

-- ── 1. DOCTOR REVIEWS TABLE ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.doctor_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id      uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id  uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  rating          smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback        text,
  is_verified     boolean NOT NULL DEFAULT true,
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_appointment_review UNIQUE (appointment_id)
);

-- ── 2. INDEXES ─────────────────────────────────────────────────────────────
-- Speed up doctor-scoped and clinic-scoped aggregation queries.

CREATE INDEX IF NOT EXISTS idx_doctor_reviews_doctor
  ON public.doctor_reviews (doctor_id);

CREATE INDEX IF NOT EXISTS idx_doctor_reviews_clinic
  ON public.doctor_reviews (clinic_id, created_at DESC);

-- ── 3. ROW LEVEL SECURITY ──────────────────────────────────────────────────
-- Clinic isolation: authenticated users can only see/modify reviews belonging
-- to their own clinic, matching the pattern used across all other tables.

ALTER TABLE public.doctor_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic isolation reviews"
  ON public.doctor_reviews
  FOR ALL
  TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());
