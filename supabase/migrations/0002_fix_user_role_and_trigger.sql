-- 1. Create the user_role enum if it does not exist
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'doctor', 'nurse', 'receptionist', 'staff');
  end if;
end $$;

-- 2. Drop the old trigger and recreate the function with safe fallback
drop trigger if exists on_auth_user_created on auth.users;

create or replace function public.handle_new_user()
returns trigger as $$
declare
  default_clinic_id uuid;
begin
  -- Find an existing clinic or create a default one
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

  -- Insert profile
  insert into public.profiles (id, clinic_id, full_name, role)
  values (
    new.id,
    default_clinic_id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'admin'::public.user_role)
  )
  on conflict (id) do update set
    clinic_id = excluded.clinic_id,
    full_name = excluded.full_name,
    role = excluded.role;

  return new;
end;
$$ language plpgsql security definer;

-- 3. Re-enable trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Ensure a base clinic exists
insert into public.clinics (name, address, phone, timezone)
select 'VitalSync Primary Clinic', 'Chennai, India', '+91 99999 99999', 'Asia/Kolkata'
where not exists (select 1 from public.clinics);
