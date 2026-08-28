-- Local/dev seed: one clinic. Admin profile is created automatically the
-- first time you register through the app (the on_auth_user_created
-- trigger attaches new users to whichever clinic was created first).

insert into clinics (name, address, phone, timezone)
values ('VitalSync Demo Clinic', '12 MG Road, Chennai, Tamil Nadu', '+91 44 1234 5678', 'Asia/Kolkata');
