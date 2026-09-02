-- ─────────────────────────────────────────────────────────────────────────────
-- 0008_rls_prescription_staff_access.sql
-- Relax RLS policies on prescriptions & prescription_items so that admins and
-- front-desk staff can also create/view prescriptions, not just doctors.
--
-- Previously the INSERT policy required `role = 'doctor'` and
-- `doctor_id = auth.uid()`.  This blocked admins who prescribe on behalf of a
-- doctor (doctor_id is resolved server-side to a valid clinic doctor).
--
-- Changes:
--   1. INSERT on prescriptions  → allow role IN ('doctor', 'admin', 'front_desk')
--      and remove the doctor_id = auth.uid() check (the server action already
--      validates clinic ownership via current_clinic_id()).
--   2. INSERT on prescription_items → same role allow-list, scoped by the
--      parent prescription's clinic_id.
--   3. SELECT on prescriptions  → any authenticated clinic staff can read.
--   4. SELECT on prescription_items → any authenticated clinic staff can read.
--   5. UPDATE on prescriptions  → allow staff to update status/notes.
-- Guarded so re-applying is a no-op.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Drop old restrictive policies (idempotent) ────────────────────────────
DROP POLICY IF EXISTS "staff insert prescriptions"          ON public.prescriptions;
DROP POLICY IF EXISTS "staff select prescriptions"          ON public.prescriptions;
DROP POLICY IF EXISTS "staff update prescriptions"          ON public.prescriptions;
DROP POLICY IF EXISTS "staff delete prescriptions"          ON public.prescriptions;
DROP POLICY IF EXISTS "doctors insert prescriptions"        ON public.prescriptions;

DROP POLICY IF EXISTS "staff write prescription items"      ON public.prescription_items;
DROP POLICY IF EXISTS "staff select prescription items"     ON public.prescription_items;
DROP POLICY IF EXISTS "staff update prescription items"     ON public.prescription_items;
DROP POLICY IF EXISTS "staff delete prescription items"     ON public.prescription_items;
DROP POLICY IF EXISTS "doctors write prescription items"    ON public.prescription_items;

-- ─── prescriptions ────────────────────────────────────────────────────────────

-- INSERT: allow doctor, admin, front_desk (clinic ownership via current_clinic_id)
CREATE POLICY "staff insert prescriptions"
  ON public.prescriptions
  FOR INSERT
  WITH CHECK (
    clinic_id = public.current_clinic_id()
    AND public.current_role() IN ('doctor', 'admin', 'front_desk')
  );

-- SELECT: any authenticated staff within the same clinic
CREATE POLICY "staff select prescriptions"
  ON public.prescriptions
  FOR SELECT
  USING (
    clinic_id = public.current_clinic_id()
  );

-- UPDATE: allow staff to update prescriptions (status, notes, diagnosis)
CREATE POLICY "staff update prescriptions"
  ON public.prescriptions
  FOR UPDATE
  USING (
    clinic_id = public.current_clinic_id()
    AND public.current_role() IN ('doctor', 'admin', 'front_desk')
  )
  WITH CHECK (
    clinic_id = public.current_clinic_id()
  );

-- ─── prescription_items ───────────────────────────────────────────────────────

-- INSERT: allow staff if the parent prescription belongs to their clinic
CREATE POLICY "staff insert prescription items"
  ON public.prescription_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.prescriptions p
      WHERE p.id = prescription_items.prescription_id
        AND p.clinic_id = public.current_clinic_id()
        AND public.current_role() IN ('doctor', 'admin', 'front_desk')
    )
  );

-- SELECT: allow staff to read items for their clinic's prescriptions
CREATE POLICY "staff select prescription items"
  ON public.prescription_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.prescriptions p
      WHERE p.id = prescription_items.prescription_id
        AND p.clinic_id = public.current_clinic_id()
    )
  );

-- UPDATE: allow staff to update items for their clinic's prescriptions
CREATE POLICY "staff update prescription items"
  ON public.prescription_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.prescriptions p
      WHERE p.id = prescription_items.prescription_id
        AND p.clinic_id = public.current_clinic_id()
        AND public.current_role() IN ('doctor', 'admin', 'front_desk')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.prescriptions p
      WHERE p.id = prescription_items.prescription_id
        AND p.clinic_id = public.current_clinic_id()
    )
  );
