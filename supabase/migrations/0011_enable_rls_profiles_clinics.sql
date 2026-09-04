-- Migration 0011: Enable Row Level Security on profiles and clinics
--
-- These tables had RLS policies defined in 0001_init.sql but
-- ALTER TABLE … ENABLE ROW LEVEL SECURITY was never executed on them.
-- Without this, the policies exist in the catalog but are NOT enforced,
-- allowing any authenticated user to read/modify ALL profiles and clinics
-- regardless of clinic ownership or role.
--
-- Policies already defined in 0001_init.sql:
--   clinics  : "read own clinic" (SELECT), "admin updates own clinic" (UPDATE)
--   profiles : "read clinic profiles" (SELECT), "admin manages profiles" (ALL),
--              "self updates own profile" (UPDATE)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics  ENABLE ROW LEVEL SECURITY;
