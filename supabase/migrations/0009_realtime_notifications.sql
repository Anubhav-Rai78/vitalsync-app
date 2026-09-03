-- VitalSync — real-time, live notification engine
-- Extends the existing public.notifications table (per-user recipient via
-- profile_id, so each staff member tracks their own read state) with the
-- columns the UI/popover needs, adds a realtime publication, and adds DB
-- triggers that emit real notifications from live clinical events.

-- ── 1. Notification type enum ──────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum (
      'patient_registered',
      'appointment_scheduled',
      'invoice_created',
      'invoice_overdue',
      'clinical_notice'
    );
  end if;
exception
  when duplicate_object then null;
end $$;

-- ── 2. Extend notifications (non-destructive ALTER) ────────────────────────
-- Keeps profile_id + body intact so the usage-monitor Edge Function and any
-- existing writers keep working with zero changes.
alter table public.notifications
  add column if not exists type notification_type not null default 'clinical_notice',
  add column if not exists link_url text;

-- Speed up unread-badge queries and newest-first ordering.
create index if not exists idx_notifications_profile_read
  on public.notifications (profile_id, is_read);
create index if not exists idx_notifications_created_at
  on public.notifications (created_at desc);

-- ── 3. Realtime publication ────────────────────────────────────────────────
-- Safely add the table to the Supabase realtime publication in case it isn't
-- there yet.
do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
exception
  when duplicate_object then null;
end $$;

-- ── 4. Trigger: Patient registration (fan out to all clinic staff) ─────────
create or replace function public.notify_patient_registered()
returns trigger as $$
begin
  insert into public.notifications (profile_id, type, title, body, link_url)
  select
    p.id,
    'patient_registered'::public.notification_type,
    'New Patient Registered',
    concat('Patient record for ', NEW.full_name, ' was registered.'),
    '/patients'
  from public.profiles p
  where p.clinic_id = NEW.clinic_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_patient_registered on public.patients;
create trigger trg_notify_patient_registered
  after insert on public.patients
  for each row execute function public.notify_patient_registered();

-- ── 5. Trigger: Appointment booking (target the assigned doctor) ───────────
create or replace function public.notify_appointment_scheduled()
returns trigger as $$
begin
  insert into public.notifications (profile_id, type, title, body, link_url)
  values (
    NEW.doctor_id,
    'appointment_scheduled'::public.notification_type,
    'New Appointment Booked',
    'A new consultation slot has been confirmed.',
    '/appointments'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_appointment_scheduled on public.appointments;
create trigger trg_notify_appointment_scheduled
  after insert on public.appointments
  for each row execute function public.notify_appointment_scheduled();
