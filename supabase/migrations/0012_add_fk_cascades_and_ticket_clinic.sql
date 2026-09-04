-- VitalSync — batch 3: FK cascades + ticket clinic isolation
-- 1. Add ON DELETE CASCADE to FKs referencing profiles(id) that were missing it.
-- 2. Add clinic_id to support_tickets for proper tenant isolation.

-- ── 1. FK CASCADE FIXES ─────────────────────────────────────────────────────
-- PostgreSQL does not support ALTER FOREIGN KEY ... ON DELETE CASCADE directly.
-- We must DROP + re-CREATE each constraint.

-- patients.created_by
ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS patients_created_by_fkey,
  ADD CONSTRAINT patients_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- appointments.doctor_id  (NOT NULL — cascade would violate FK, so SET NULL is
-- impossible; we use CASCADE here because deleting a doctor should remove their
-- future appointments.  Past appointments are clinical records that survive in
-- audit_logs.)
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_doctor_id_fkey,
  ADD CONSTRAINT appointments_doctor_id_fkey
    FOREIGN KEY (doctor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- appointments.created_by
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_created_by_fkey,
  ADD CONSTRAINT appointments_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- prescriptions.doctor_id (NOT NULL — cascade for consistency with appointments)
ALTER TABLE public.prescriptions
  DROP CONSTRAINT IF EXISTS prescriptions_doctor_id_fkey,
  ADD CONSTRAINT prescriptions_doctor_id_fkey
    FOREIGN KEY (doctor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- audit_logs.actor_id
ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey,
  ADD CONSTRAINT audit_logs_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- vitals.recorded_by (from 0005)
ALTER TABLE public.vitals
  DROP CONSTRAINT IF EXISTS vitals_recorded_by_fkey,
  ADD CONSTRAINT vitals_recorded_by_fkey
    FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ── 2. TICKET CLINIC ISOLATION ──────────────────────────────────────────────

-- Add clinic_id column to support_tickets (NOT NULL with a default via a
-- backfill step). We use a two-step approach: add nullable, backfill, then
-- set NOT NULL.
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;

-- Backfill clinic_id from the submitting user's profile.
UPDATE public.support_tickets st
  SET clinic_id = p.clinic_id
  FROM public.profiles p
  WHERE st.user_id = p.id AND st.clinic_id IS NULL;

-- Now make it NOT NULL (safe after backfill).
ALTER TABLE public.support_tickets
  ALTER COLUMN clinic_id SET NOT NULL;

-- Speed up clinic-scoped queries.
CREATE INDEX IF NOT EXISTS idx_support_tickets_clinic
  ON public.support_tickets (clinic_id, created_at DESC);

-- ── 3. TICKET RLS OVERHAUL ─────────────────────────────────────────────────
-- Drop existing policies and re-create with clinic isolation.

DROP POLICY IF EXISTS "Users can insert own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can read own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can read all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON public.support_tickets;

-- INSERT: authenticated users can insert tickets for themselves (scoped to own clinic).
CREATE POLICY "Users can insert own tickets"
  ON public.support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND clinic_id = public.current_clinic_id()
  );

-- SELECT: users can read their own tickets within their clinic.
CREATE POLICY "Users can read own tickets"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND clinic_id = public.current_clinic_id()
  );

-- SELECT: admins can read all tickets within their clinic.
CREATE POLICY "Admins can read all tickets"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (
    clinic_id = public.current_clinic_id()
    AND public.current_role() = 'admin'
  );

-- UPDATE: admins can update any ticket within their clinic.
CREATE POLICY "Admins can update all tickets"
  ON public.support_tickets
  FOR UPDATE
  TO authenticated
  USING (
    clinic_id = public.current_clinic_id()
    AND public.current_role() = 'admin'
  )
  WITH CHECK (true);