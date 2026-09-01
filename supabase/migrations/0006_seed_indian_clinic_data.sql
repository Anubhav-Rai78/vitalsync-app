-- ─────────────────────────────────────────────────────────────────────────────
-- 0006_seed_indian_clinic_data.sql
-- Seed comprehensive live data for MedFlow Clinic (Indian Healthcare Context)
--
-- Adapted to the actual VitalSync schema:
--   * clinics has NO `email` column            -> email omitted
--   * invoices.status allows ('draft','sent','paid','overdue','void')
--       -> provided 'pending' becomes 'sent' (the UI maps 'sent' -> "Pending")
--   * profiles.role is a user_role enum        -> values are cast
--   * profiles.id references auth.users(id) FK -> the 4 doctor rows first get
--       matching auth.users rows (standard Supabase demo-seed pattern) so the
--       doctor profiles can be inserted with the same ids
--   * All business ids are FIXED literal UUIDs so the seed is idempotent:
--       re-runs (or `supabase db reset` + push) never duplicate rows thanks to
--       ON CONFLICT (id) DO NOTHING / DO UPDATE guards.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_clinic_id uuid;
  v_admin_id  uuid;

  -- Fixed deterministic ids (10..50 prefix namespaces for readability)
  v_doc_cardio uuid := '10000000-0000-0000-0000-000000000001';
  v_doc_peds   uuid := '10000000-0000-0000-0000-000000000002';
  v_doc_gen    uuid := '10000000-0000-0000-0000-000000000003';
  v_doc_neuro  uuid := '10000000-0000-0000-0000-000000000004';

  v_pat_1 uuid := '20000000-0000-0000-0000-000000000001';
  v_pat_2 uuid := '20000000-0000-0000-0000-000000000002';
  v_pat_3 uuid := '20000000-0000-0000-0000-000000000003';
  v_pat_4 uuid := '20000000-0000-0000-0000-000000000004';
  v_pat_5 uuid := '20000000-0000-0000-0000-000000000005';
  v_pat_6 uuid := '20000000-0000-0000-0000-000000000006';

  v_apt_1 uuid := '30000000-0000-0000-0000-000000000001';
  v_apt_2 uuid := '30000000-0000-0000-0000-000000000002';
  v_apt_3 uuid := '30000000-0000-0000-0000-000000000003';
  v_apt_4 uuid := '30000000-0000-0000-0000-000000000004';

  v_inv_1 uuid := '40000000-0000-0000-0000-000000000001';
  v_inv_2 uuid := '40000000-0000-0000-0000-000000000002';
  v_inv_3 uuid := '40000000-0000-0000-0000-000000000003';
  v_inv_4 uuid := '40000000-0000-0000-0000-000000000004';

  v_pres_1 uuid := '50000000-0000-0000-0000-000000000001';
BEGIN
  -- 1. Fetch (or create) default clinic
  SELECT id INTO v_clinic_id FROM public.clinics ORDER BY created_at ASC LIMIT 1;
  IF v_clinic_id IS NULL THEN
    INSERT INTO public.clinics (name, address, phone, timezone)
    VALUES (
      'MedFlow Health Hub - Indiranagar',
      '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
      '+91 80 4123 4567',
      'Asia/Kolkata'
    )
    RETURNING id INTO v_clinic_id;
  END IF;

  -- 2. Create matching auth.users rows for the demo doctors.
  --    profiles.id is FK -> auth.users(id), so each doctor must exist there.
  --    The on_auth_user_created trigger ALSO auto-creates a minimal profile,
  --    which we enrich (specialty / phone / license_no) in step 3 below.
  INSERT INTO auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (v_doc_cardio, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'dr.rajesh.sharma@medflow.in', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Rajesh Sharma","role":"doctor"}', now(), now()),
    (v_doc_peds, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'dr.ananya.deshmukh@medflow.in', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Ananya Deshmukh","role":"doctor"}', now(), now()),
    (v_doc_gen, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'dr.vikramaditya.verma@medflow.in', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Vikramaditya Verma","role":"doctor"}', now(), now()),
    (v_doc_neuro, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'dr.meera.nambiar@medflow.in', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Meera Nambiar","role":"doctor"}', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Fetch an admin profile (for audit/created_by/recorded_by links). Falls back
  -- to any existing profile so the seed still works on an empty account.
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin'::user_role LIMIT 1;
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM public.profiles LIMIT 1;
  END IF;

  -- 3. Insert Doctors (Profiles) — enrich the trigger-created rows if present.
  INSERT INTO public.profiles (id, clinic_id, full_name, role, specialty, phone, license_no, is_active)
  VALUES
    (v_doc_cardio, v_clinic_id, 'Dr. Rajesh Sharma',      'doctor'::user_role, 'Cardiology',       '+91 98450 12345', 'KMC-48291',  true),
    (v_doc_peds,   v_clinic_id, 'Dr. Ananya Deshmukh',    'doctor'::user_role, 'Pediatrics',       '+91 98201 54321', 'MMC-77392',  true),
    (v_doc_gen,    v_clinic_id, 'Dr. Vikramaditya Verma', 'doctor'::user_role, 'General Medicine', '+91 97110 98765', 'DMC-11029',  true),
    (v_doc_neuro,  v_clinic_id, 'Dr. Meera Nambiar',      'doctor'::user_role, 'Neurology',        '+91 94470 67890', 'TCMC-88214', true)
  ON CONFLICT (id) DO UPDATE SET
    clinic_id = EXCLUDED.clinic_id,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    specialty = EXCLUDED.specialty,
    phone = EXCLUDED.phone,
    license_no = EXCLUDED.license_no,
    is_active = EXCLUDED.is_active;

  -- 4. Insert Doctor Weekly Availability (all 4 doctors, 7 days each)
  INSERT INTO public.doctor_availability (clinic_id, doctor_id, day_of_week, start_time, end_time, is_available)
  SELECT v_clinic_id, v_doc_cardio, d, '09:00', '17:00', (d BETWEEN 1 AND 5) FROM generate_series(0, 6) d
  ON CONFLICT (doctor_id, day_of_week) DO UPDATE SET is_available = EXCLUDED.is_available;

  INSERT INTO public.doctor_availability (clinic_id, doctor_id, day_of_week, start_time, end_time, is_available)
  SELECT v_clinic_id, v_doc_peds, d, '10:00', '18:00', (d BETWEEN 1 AND 6) FROM generate_series(0, 6) d
  ON CONFLICT (doctor_id, day_of_week) DO UPDATE SET is_available = EXCLUDED.is_available;

  INSERT INTO public.doctor_availability (clinic_id, doctor_id, day_of_week, start_time, end_time, is_available)
  SELECT v_clinic_id, v_doc_gen, d, '09:30', '17:30', (d BETWEEN 1 AND 6) FROM generate_series(0, 6) d
  ON CONFLICT (doctor_id, day_of_week) DO UPDATE SET is_available = EXCLUDED.is_available;

  INSERT INTO public.doctor_availability (clinic_id, doctor_id, day_of_week, start_time, end_time, is_available)
  SELECT v_clinic_id, v_doc_neuro, d, '11:00', '19:00', (d BETWEEN 2 AND 6) FROM generate_series(0, 6) d
  ON CONFLICT (doctor_id, day_of_week) DO UPDATE SET is_available = EXCLUDED.is_available;

  -- 5. Insert Patients (Indian Context)
  INSERT INTO public.patients (id, clinic_id, full_name, sex, dob, phone, email, address, allergies)
  VALUES
    (v_pat_1, v_clinic_id, 'Sarah Jenkins',    'female', '1980-04-12', '+91 98765 43210', 'sarah.jenkins@gmail.com',     '221B Baker Street, Indiranagar, Bengaluru, Karnataka 560038', 'Penicillin (Severe)'),
    (v_pat_2, v_clinic_id, 'Naveen Venkat',    'male',   '1995-07-18', '+91 91234 56789', 'naveen.v@outlook.com',       '45 Koramangala 4th Block, Bengaluru, Karnataka 560034',      'Sulfa drugs'),
    (v_pat_3, v_clinic_id, 'Urbajit Roy',      'male',   '1998-10-08', '+91 99887 76655', 'urbajit.roy@yahoo.com',      '12 Salt Lake Sector V, Kolkata, West Bengal 700091',          'Peanuts (Mild)'),
    (v_pat_4, v_clinic_id, 'Ragul Arumugam',   'male',   '1988-11-23', '+91 65472 36368', 'ragul.a@rediffmail.com',     '8 Anna Salai, T. Nagar, Chennai, Tamil Nadu 600017',          NULL),
    (v_pat_5, v_clinic_id, 'Pooja Iyer',       'female', '1992-03-15', '+91 98401 11223', 'pooja.iyer@gmail.com',       '78 Powai Lake Road, Mumbai, Maharashtra 400076',              'Aspirin'),
    (v_pat_6, v_clinic_id, 'Amitabh Sengupta', 'male',   '1965-02-22', '+91 98102 33445', 'amitabh.s@gmail.com',        '19 Golf Links, New Delhi 110003',                             NULL)
  ON CONFLICT (id) DO NOTHING;

  -- 6. Insert Live Patient Vitals
  INSERT INTO public.vitals (clinic_id, patient_id, recorded_by, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, weight_kg, temperature_c, spo2, recorded_at)
  VALUES
    (v_clinic_id, v_pat_1, v_admin_id, 128, 82, 72, 64.5, 36.8, 99, NOW() - INTERVAL '1 hour'),
    (v_clinic_id, v_pat_2, v_admin_id, 120, 80, 76, 74.0, 37.1, 98, NOW() - INTERVAL '3 hours'),
    (v_clinic_id, v_pat_3, v_admin_id, 134, 88, 80, 81.2, 38.2, 97, NOW() - INTERVAL '5 hours'),
    (v_clinic_id, v_pat_4, v_admin_id, 118, 76, 68, 68.0, 36.6, 99, NOW() - INTERVAL '1 day');

  -- 7. Insert Appointments (spread over past and upcoming days)
  INSERT INTO public.appointments (id, clinic_id, patient_id, doctor_id, start_time, end_time, status, reason, notes, created_by)
  VALUES
    (v_apt_1, v_clinic_id, v_pat_1, v_doc_cardio, NOW() + INTERVAL '2 hours',                   NOW() + INTERVAL '2 hours'  + INTERVAL '45 minutes', 'confirmed', 'Chest Tightness Consultation', 'Patient reports mild exertional dyspnea.', v_admin_id),
    (v_apt_2, v_clinic_id, v_pat_2, v_doc_gen,    NOW() + INTERVAL '4 hours',                   NOW() + INTERVAL '4 hours'  + INTERVAL '30 minutes', 'scheduled', 'Annual Wellness Checkup',          'Routine annual metabolic screening.',       v_admin_id),
    (v_apt_3, v_clinic_id, v_pat_3, v_doc_peds,   NOW() - INTERVAL '1 day',                     NOW() - INTERVAL '1 day'    + INTERVAL '30 minutes', 'completed', 'Follow-up Consultation',            'Fever subsided, vitals stable.',            v_admin_id),
    (v_apt_4, v_clinic_id, v_pat_4, v_doc_neuro,  NOW() + INTERVAL '1 day',                     NOW() + INTERVAL '1 day'    + INTERVAL '45 minutes', 'scheduled', 'Migraine Evaluation',               'Persistent episodic headaches.',            v_admin_id)
  ON CONFLICT (id) DO NOTHING;

  -- 8. Insert Invoices & Invoice Line Items
  -- NOTE: schema allows status in ('draft','sent','paid','overdue','void').
  --       The UI renders 'sent' as "Pending".
  INSERT INTO public.invoices (id, clinic_id, patient_id, appointment_id, invoice_number, status, subtotal, tax, total, currency, due_date, created_at)
  VALUES
    (v_inv_1, v_clinic_id, v_pat_1, v_apt_1, 'INV-2026-0892', 'paid',    245.00, 0.00, 245.00, 'INR', CURRENT_DATE + 14, NOW() - INTERVAL '2 days'),
    (v_inv_2, v_clinic_id, v_pat_2, v_apt_2, 'INV-2026-0885', 'sent',    112.50, 0.00, 112.50, 'INR', CURRENT_DATE + 7,  NOW() - INTERVAL '1 day'),
    (v_inv_3, v_clinic_id, v_pat_3, v_apt_3, 'INV-2026-0870', 'overdue',  75.00, 0.00,  75.00, 'INR', CURRENT_DATE - 3,  NOW() - INTERVAL '10 days'),
    (v_inv_4, v_clinic_id, v_pat_4, v_apt_4, 'INV-2026-0864', 'paid',    180.00, 0.00, 180.00, 'INR', CURRENT_DATE + 10, NOW() - INTERVAL '4 days')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.invoice_items (invoice_id, description, quantity, unit_price, amount)
  VALUES
    (v_inv_1, 'Cardiology Consultation',         1, 150.00, 150.00),
    (v_inv_1, 'ECG (Electrocardiogram)',         1,  95.00,  95.00),
    (v_inv_2, 'Lab Work (Complete Blood Panel)', 1, 112.50, 112.50),
    (v_inv_3, 'Follow-up Clinical Visit',        1,  75.00,  75.00),
    (v_inv_4, 'General Health Check & Lipid Profile', 1, 180.00, 180.00);

  -- 9. Insert Payments
  INSERT INTO public.payments (invoice_id, amount, status, method, paid_at)
  VALUES
    (v_inv_1, 245.00, 'captured', 'UPI',         NOW() - INTERVAL '2 days'),
    (v_inv_4, 180.00, 'captured', 'Credit Card', NOW() - INTERVAL '4 days');

  -- 10. Insert Prescriptions (+ line items so the detail page has content)
  INSERT INTO public.prescriptions (id, clinic_id, patient_id, doctor_id, appointment_id, diagnosis, notes)
  VALUES (v_pres_1, v_clinic_id, v_pat_1, v_doc_cardio, v_apt_1, 'Essential Hypertension (I10)', 'Take medication regularly with breakfast.')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.prescription_items (prescription_id, drug_name, dosage, frequency, duration, instructions)
  VALUES
    (v_pres_1, 'Amlodipine 5mg',  '5 mg',  'Once daily after breakfast', '30 days', 'Monitor BP daily; report dizziness.'),
    (v_pres_1, 'Metoprolol 25mg', '25 mg', 'Twice daily',               '30 days', 'Do not stop abruptly.');

  -- 11. Usage Metrics for Analytics Dashboard
  INSERT INTO public.usage_metrics (clinic_id, metric_name, value, recorded_at)
  VALUES
    (v_clinic_id, 'total_patients',           1248,   NOW()),
    (v_clinic_id, 'monthly_revenue',          142500, NOW()),
    (v_clinic_id, 'avg_wait_time_minutes',    18,     NOW()),
    (v_clinic_id, 'fulfillment_rate_percent', 94,     NOW());
END $$;