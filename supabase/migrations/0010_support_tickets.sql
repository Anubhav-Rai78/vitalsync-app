-- VitalSync — support ticket system (incident desk)
-- Provides a structured way for clinic staff to report issues and for
-- admins to triage them from a dedicated /settings/tickets desk.

-- ── 1. Support tickets table ────────────────────────────────────────────────
create table if not exists public.support_tickets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  user_email text not null,
  ticket_ref text not null,
  category   text not null default 'general',
  severity   text not null default 'low',
  description text not null,
  status     text not null default 'open'
               check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now()
);

-- Speed up admin queries (newest first, filter by status).
create index if not exists idx_support_tickets_status
  on public.support_tickets (status, created_at desc);
create index if not exists idx_support_tickets_user
  on public.support_tickets (user_id, created_at desc);

-- ── 2. Row-Level Security ───────────────────────────────────────────────────
-- Users can insert their own tickets.
-- Users can read their own tickets.
-- Admins (role = 'admin') can read all tickets and update any ticket.
alter table public.support_tickets enable row level security;

-- INSERT: authenticated users can insert tickets for themselves.
create policy "Users can insert own tickets"
  on public.support_tickets
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- SELECT: users can read their own tickets.
create policy "Users can read own tickets"
  on public.support_tickets
  for select
  to authenticated
  using (auth.uid() = user_id);

-- SELECT: admins can read all tickets.
create policy "Admins can read all tickets"
  on public.support_tickets
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- UPDATE: admins can update any ticket (status changes).
create policy "Admins can update all tickets"
  on public.support_tickets
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (true);
