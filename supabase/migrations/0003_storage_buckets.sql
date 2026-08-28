-- Create storage buckets for avatars and logos if they don't exist
insert into storage.buckets (id, name, public)
values 
  ('avatars', 'avatars', true),
  ('logos', 'logos', true)
on conflict (id) do nothing;

-- RLS policies for avatars bucket
create policy "Public read access to avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Authenticated users can update avatars"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- RLS policies for logos bucket
create policy "Public read access to logos"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "Authenticated users can upload logos"
  on storage.objects for insert
  with check (bucket_id = 'logos' and auth.role() = 'authenticated');

create policy "Authenticated users can update logos"
  on storage.objects for update
  using (bucket_id = 'logos' and auth.role() = 'authenticated');
