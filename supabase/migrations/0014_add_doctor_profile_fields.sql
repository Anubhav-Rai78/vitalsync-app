-- ─────────────────────────────────────────────────────────────────────────────
-- 0014_add_doctor_profile_fields.sql
-- Add email and room columns to profiles so doctor listings render with
-- realistic contact/location data instead of hardcoded fallbacks.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add columns (idempotent via IF NOT EXISTS)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS room  text;

-- 2. Back-fill the 4 seeded doctors with realistic Indian clinic data.
--    These are the same UUIDs defined in 0006_seed_indian_clinic_data.sql.
UPDATE public.profiles
SET    email = 'dr.rajesh.sharma@medflow.in',
       room  = 'Room 301'
WHERE  full_name = 'Dr. Rajesh Sharma'
  AND  role = 'doctor';

UPDATE public.profiles
SET    email = 'dr.ananya.deshmukh@medflow.in',
       room  = 'Room 205'
WHERE  full_name = 'Dr. Ananya Deshmukh'
  AND  role = 'doctor';

UPDATE public.profiles
SET    email = 'dr.vikramaditya.verma@medflow.in',
       room  = 'Room 102'
WHERE  full_name = 'Dr. Vikramaditya Verma'
  AND  role = 'doctor';

UPDATE public.profiles
SET    email = 'dr.meera.nambiar@medflow.in',
       room  = 'Room 304'
WHERE  full_name = 'Dr. Meera Nambiar'
  AND  role = 'doctor';