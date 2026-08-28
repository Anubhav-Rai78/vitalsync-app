-- VitalSync — initial schema
-- Single-tenant today, multi-tenant-ready: every clinical table carries
-- clinic_id and every RLS policy scopes on it.[cite: 11]

create extension if not exists "uuid-ossp";[cite: 11]

-- ────────────────────────────────────────────────────────────────
-- Tenancy & identity[cite: 11]
-- ────────────────────────────────────────────────────────────────

create table clinics (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  address text,
  phone text,
  timezone text not null default 'Asia/Kolkata',
  scaling_mode text not null default 'notify' check (scaling_mode in ('free','notify','auto')),
  subscription_tier text not null default 'free' check (subscription_tier in ('free','paid')),
  created_at timestamptz not null default now()
);[cite: 11]

create type user_role as enum ('admin', 'doctor', 'front_desk');[cite: 11]

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  clinic_id uuid not null references clinics(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'front_desk',
  phone text,
  avatar_url text,
  specialty text,          -- doctors only
  license_no text,         -- doctors only
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);[cite: 11]

-- Auto-create a profile row whenever a new auth user signs up.[cite: 11]
-- Role/clinic assignment happens at registration time via the[cite: 11]
-- register Server Action, which updates this row right after signup.[cite: 11]
create function public.handle_new_user()
returns trigger as $$
declare
  default_clinic_id uuid;
begin
  select id into default_clinic_id from public.clinics order by created_at asc limit 1;
  
  -- If no clinic exists yet, auto-create the initial clinic for the user[cite: 11]
  if default_clinic_id is null then
    insert into public.clinics (name)
    values (coalesce(new.raw_user_meta_data->>'clinic_name', 'VitalSync Clinic'))
    returning id into default_clinic_id;
  end if;

  insert into public.profiles (id, clinic_id, full_name, role)
  values (
    new.id,
    default_clinic_id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'front_desk')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();[cite: 11]

-- ────────────────────────────────────────────────────────────────
-- Clinical records[cite: 11]
-- ────────────────────────────────────────────────────────────────

create table patients (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  full_name text not null,
  dob date,
  sex text check (sex in ('male','female','other')),
  phone text,
  email text,
  address text,
  blood_group text,
  allergies text,
  emergency_contact text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);[cite: 11]

create table appointments (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid not null references profiles(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled','confirmed','completed','cancelled','no_show')),
  reason text,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);[cite: 11]

create table prescriptions (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid not null references profiles(id),
  appointment_id uuid references appointments(id),
  diagnosis text,
  notes text,
  created_at timestamptz not null default now()
);[cite: 11]

create table prescription_items (
  id uuid primary key default uuid_generate_v4(),
  prescription_id uuid not null references prescriptions(id) on delete cascade,
  drug_name text not null,
  dosage text,
  frequency text,
  duration text,
  instructions text
);[cite: 11]

-- ────────────────────────────────────────────────────────────────
-- Billing[cite: 11]
-- ────────────────────────────────────────────────────────────────

create table invoices (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  appointment_id uuid references appointments(id),
  invoice_number text not null,
  status text not null default 'draft'
    check (status in ('draft','sent','paid','overdue','void')),
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  currency text not null default 'INR',
  due_date date,
  created_at timestamptz not null default now(),
  unique (clinic_id, invoice_number)
);[cite: 11]

create table invoice_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0
);[cite: 11]

create table payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  razorpay_order_id text,
  razorpay_payment_id text,
  amount numeric(12,2) not null,
  status text not null default 'created'
    check (status in ('created','authorized','captured','failed','refunded')),
  method text,
  paid_at timestamptz
);[cite: 11]

-- ────────────────────────────────────────────────────────────────
-- Ops / admin[cite: 11]
-- ────────────────────────────────────────────────────────────────

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);[cite: 11]

create table usage_metrics (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  metric_name text not null,
  value numeric not null,
  recorded_at timestamptz not null default now()
);[cite: 11]

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);[cite: 11]

-- ────────────────────────────────────────────────────────────────
-- Row Level Security[cite: 11]
-- ────────────────────────────────────────────────────────────────

alter table clinics enable row level security;[cite: 11]
alter table profiles enable row level security;[cite: 11]
alter table patients enable row level security;[cite: 11]
alter table appointments enable row level security;[cite: 11]
alter table prescriptions enable row level security;[cite: 11]
alter table prescription_items enable row level security;[cite: 11]
alter table invoices enable row level security;[cite: 11]
alter table invoice_items enable row level security;[cite: 11]
alter table payments enable row level security;[cite: 11]
alter table audit_logs enable row level security;[cite: 11]
alter table usage_metrics enable row level security;[cite: 11]
alter table notifications enable row level security;[cite: 11]

-- Helper: current user's clinic + role, used by every policy below.[cite: 11]
create function public.current_clinic_id() returns uuid as $$
  select clinic_id from public.profiles where id = auth.uid();
$$ language sql stable security definer;[cite: 11]

create function public.current_role() returns user_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;[cite: 11]

-- clinics: members can read their own clinic; only admin can update it.[cite: 11]
create policy "read own clinic" on clinics
  for select using (id = public.current_clinic_id());[cite: 11]
create policy "admin updates own clinic" on clinics
  for update using (id = public.current_clinic_id() and public.current_role() = 'admin');[cite: 11]

-- profiles: read anyone in your clinic; only admin manages staff.[cite: 11]
create policy "read clinic profiles" on profiles
  for select using (clinic_id = public.current_clinic_id());[cite: 11]
create policy "admin manages profiles" on profiles
  for all using (clinic_id = public.current_clinic_id() and public.current_role() = 'admin');[cite: 11]
create policy "self updates own profile" on profiles
  for update using (id = auth.uid());[cite: 11]

-- Generic clinic-isolation policy, applied per table below.[cite: 11]
create policy "clinic isolation" on patients
  for all using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());[cite: 11]

create policy "clinic isolation" on appointments
  for all using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());[cite: 11]

create policy "clinic isolation" on prescriptions
  for select using (clinic_id = public.current_clinic_id());[cite: 11]
create policy "doctors write prescriptions" on prescriptions
  for insert with check (
    clinic_id = public.current_clinic_id() and public.current_role() = 'doctor'
  );[cite: 11]
create policy "doctors update own prescriptions" on prescriptions
  for update using (
    clinic_id = public.current_clinic_id() and doctor_id = auth.uid()
  );[cite: 11]

create policy "read prescription items via prescription" on prescription_items
  for select using (
    exists (
      select 1 from prescriptions p
      where p.id = prescription_items.prescription_id
      and p.clinic_id = public.current_clinic_id()
    )
  );[cite: 11]
create policy "doctors write prescription items" on prescription_items
  for insert with check (
    exists (
      select 1 from prescriptions p
      where p.id = prescription_items.prescription_id
      and p.clinic_id = public.current_clinic_id()
      and public.current_role() = 'doctor'
    )
  );[cite: 11]

create policy "clinic isolation" on invoices
  for all using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());[cite: 11]

create policy "read invoice items via invoice" on invoice_items
  for select using (
    exists (select 1 from invoices i where i.id = invoice_items.invoice_id
      and i.clinic_id = public.current_clinic_id())
  );[cite: 11]
create policy "manage invoice items via invoice" on invoice_items
  for all using (
    exists (select 1 from invoices i where i.id = invoice_items.invoice_id
      and i.clinic_id = public.current_clinic_id())
  );[cite: 11]

create policy "read payments via invoice" on payments
  for select using (
    exists (select 1 from invoices i where i.id = payments.invoice_id
      and i.clinic_id = public.current_clinic_id())
  );[cite: 11]

-- audit_logs: admin-only read, system-inserted (service role) or any[cite: 11]
-- authenticated action via the audit() trigger function below.[cite: 11]
create policy "admin reads audit log" on audit_logs
  for select using (clinic_id = public.current_clinic_id() and public.current_role() = 'admin');[cite: 11]
create policy "clinic members write audit entries" on audit_logs
  for insert with check (clinic_id = public.current_clinic_id());[cite: 11]

create policy "admin reads usage metrics" on usage_metrics
  for select using (clinic_id = public.current_clinic_id() and public.current_role() = 'admin');[cite: 11]

create policy "own notifications" on notifications
  for all using (profile_id = auth.uid());[cite: 11]

-- ────────────────────────────────────────────────────────────────
-- Audit logging trigger — fires on every write to a clinical table[cite: 11]
-- ────────────────────────────────────────────────────────────────

create function public.log_audit_event()
returns trigger as $$
declare
  v_clinic_id uuid;
begin
  v_clinic_id := coalesce(new.clinic_id, old.clinic_id);
  insert into audit_logs (clinic_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    v_clinic_id,
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$ language plpgsql security definer;[cite: 11]

create trigger audit_patients after insert or update or delete on patients
  for each row execute procedure public.log_audit_event();[cite: 11]
create trigger audit_appointments after insert or update or delete on appointments
  for each row execute procedure public.log_audit_event();[cite: 11]
create trigger audit_prescriptions after insert or update or delete on prescriptions
  for each row execute procedure public.log_audit_event();[cite: 11]
create trigger audit_invoices after insert or update or delete on invoices
  for each row execute procedure public.log_audit_event();[cite: 11]

-- ────────────────────────────────────────────────────────────────
-- Indexes[cite: 11]
-- ────────────────────────────────────────────────────────────────

create index idx_patients_clinic on patients(clinic_id);[cite: 11]
create index idx_appointments_clinic_time on appointments(clinic_id, start_time);[cite: 11]
create index idx_appointments_doctor on appointments(doctor_id, start_time);[cite: 11]
create index idx_prescriptions_patient on prescriptions(patient_id);[cite: 11]
create index idx_invoices_clinic_status on invoices(clinic_id, status);[cite: 11]
create index idx_audit_logs_clinic_time on audit_logs(clinic_id, created_at desc);[cite: 11]