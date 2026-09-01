-- VitalSync — vitals & doctor availability
-- Follows the same conventions as 0001_init.sql: every clinical table
-- carries clinic_id and RLS scopes on public.current_clinic_id().

-- ────────────────────────────────────────────────────────────────
-- Vitals (recorded against a patient, most recent first in UI)
-- ────────────────────────────────────────────────────────────────

create table vitals (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  recorded_by uuid references profiles(id),
  blood_pressure_systolic smallint check (blood_pressure_systolic between 40 and 300),
  blood_pressure_diastolic smallint check (blood_pressure_diastolic between 20 and 200),
  heart_rate smallint check (heart_rate between 20 and 300),
  weight_kg numeric(5,2) check (weight_kg between 1 and 500),
  temperature_c numeric(4,1) check (temperature_c between 25 and 45),
  spo2 smallint check (spo2 between 50 and 100),
  recorded_at timestamptz not null default now()
);

alter table vitals enable row level security;

create policy "clinic isolation" on vitals
  for all using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());

create trigger audit_vitals after insert or update or delete on vitals
  for each row execute procedure public.log_audit_event();

create index idx_vitals_patient_time on vitals(patient_id, recorded_at desc);
create index idx_vitals_clinic on vitals(clinic_id);

-- ────────────────────────────────────────────────────────────────
-- Doctor availability (one row per doctor per day of week 0=Sun..6=Sat)
-- ────────────────────────────────────────────────────────────────

create table doctor_availability (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  doctor_id uuid not null references profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null default '09:00',
  end_time time not null default '17:00',
  is_available boolean not null default true,
  unique (doctor_id, day_of_week)
);

alter table doctor_availability enable row level security;

create policy "clinic isolation" on doctor_availability
  for all using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());

create trigger audit_doctor_availability after insert or update or delete on doctor_availability
  for each row execute procedure public.log_audit_event();

create index idx_doctor_availability_doctor on doctor_availability(doctor_id);
create index idx_doctor_availability_clinic on doctor_availability(clinic_id);