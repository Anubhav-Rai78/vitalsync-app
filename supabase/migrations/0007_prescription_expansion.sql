-- ─────────────────────────────────────────────────────────────────────────────
-- 0007_prescription_expansion.sql
-- Expand the prescriptions module to support clinical workflow states and
-- richer line-item metadata used by the prescription builder & history view.
--
--   * prescriptions.status        -> 'active' | 'draft' | 'completed' | 'discontinued'
--   * prescription_items.route    -> free-text administration route (Oral / IV / Topical …)
--   * prescription_items.refills  -> number of refills allowed (0 = none)
--
-- Both are additive & backfilled with sensible defaults so existing rows keep
-- working. Guarded so re-applying the migration is a no-op.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. prescriptions.status
alter table public.prescriptions
  add column if not exists status text not null default 'active';
alter table public.prescriptions
  drop constraint if exists prescriptions_status_check;
alter table public.prescriptions
  add constraint prescriptions_status_check
  check (status in ('active', 'draft', 'completed', 'discontinued'));

-- 2. prescription_items.route
alter table public.prescription_items
  add column if not exists route text;

-- 3. prescription_items.refills
alter table public.prescription_items
  add column if not exists refills integer not null default 0;

-- Useful for the history page's "Active prescriptions" query.
create index if not exists idx_prescriptions_clinic_status
  on public.prescriptions (clinic_id, status);
