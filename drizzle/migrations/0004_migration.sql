create table public.pass_scans (id uuid primary key default gen_random_uuid(), user_id uuid not null, created_at timestamptz not null default now());
alter table public.pass_scans enable row level security;
grant select, insert on public.pass_scans to authenticated;
create policy "own pass scans read" on public.pass_scans for select to authenticated using (auth.uid() = user_id);
create policy "own pass scans insert" on public.pass_scans for insert to authenticated with check (auth.uid() = user_id);