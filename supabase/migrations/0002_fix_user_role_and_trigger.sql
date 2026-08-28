-- 1. Drop existing trigger
drop trigger if exists on_auth_user_created on auth.users;

-- 2. Ensure user_role enum exists
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'doctor', 'nurse', 'receptionist', 'staff');
  end if;
exception
  when duplicate_object then null;
end $$;

-- 3. Recreate function
create or replace function public.handle_new_user()
returns trigger as $$
declare
  default_clinic_id uuid;
  assigned_role text;
begin
  select id into default_clinic_id from public.clinics order by created_at asc limit 1;
  
  if default_clinic_id is null then
    insert into public.clinics (name, timezone, scaling_mode, subscription_tier)
    values (
      coalesce(new.raw_user_meta_data->>'clinic_name', 'VitalSync Clinic'),
      'Asia/Kolkata',
      'notify',
      'free'
    )
    returning id into default_clinic_id;
  end if;

  assigned_role := coalesce(new.raw_user_meta_data->>'role', 'admin');

  insert into public.profiles (id, clinic_id, full_name, role)
  values (
    new.id,
    default_clinic_id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    assigned_role
  )
  on conflict (id) do update set
    clinic_id = excluded.clinic_id,
    full_name = excluded.full_name,
    role = excluded.role;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 4. Re-enable trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
