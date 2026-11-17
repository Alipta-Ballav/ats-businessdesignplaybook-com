create type public.app_role as enum ('candidate', 'recruiter');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  headline text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.choose_role(_role app_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from public.user_roles where user_id = auth.uid()) then return; end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), _role);
end $$;
revoke execute on function public.choose_role(app_role) from public, anon;
grant execute on function public.choose_role(app_role) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare r text := new.raw_user_meta_data->>'role';
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  if r in ('candidate', 'recruiter') then
    insert into public.user_roles (user_id, role) values (new.id, r::app_role);
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null,
  title text not null,
  func text not null,
  seniority text not null,
  description text not null default '',
  flexibility int not null default 50,
  preset text not null default 'Balanced Match',
  mandatory jsonb not null default '[]',
  preferred jsonb not null default '[]',
  weights jsonb not null default '{"JR":30,"FR":40,"HP":30}',
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.jobs to anon;
grant select, insert, update, delete on public.jobs to authenticated;
grant all on public.jobs to service_role;
alter table public.jobs enable row level security;
create policy "open jobs are public" on public.jobs for select to anon, authenticated using (is_open);
create policy "recruiter reads own jobs" on public.jobs for select to authenticated using (auth.uid() = recruiter_id);
create policy "recruiter creates jobs" on public.jobs for insert to authenticated
  with check (auth.uid() = recruiter_id and public.has_role(auth.uid(), 'recruiter'));
create policy "recruiter updates own jobs" on public.jobs for update to authenticated using (auth.uid() = recruiter_id);
create policy "recruiter deletes own jobs" on public.jobs for delete to authenticated using (auth.uid() = recruiter_id);

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  job_id uuid references public.jobs(id) on delete set null,
  job_title text not null,
  job_description text not null,
  mandatory jsonb not null default '[]',
  resume_text text not null,
  evidence jsonb not null,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.scans to authenticated;
grant all on public.scans to service_role;
alter table public.scans enable row level security;
create policy "own scans read" on public.scans for select to authenticated using (auth.uid() = user_id);
create policy "own scans insert" on public.scans for insert to authenticated with check (auth.uid() = user_id);
create policy "own scans delete" on public.scans for delete to authenticated using (auth.uid() = user_id);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  candidate_user_id uuid,
  name text not null,
  job_role text not null default '',
  years int not null default 0,
  domain text not null default '',
  resume_text text not null,
  evidence jsonb not null,
  override_status text,
  override_rationale text,
  override_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.applications to authenticated;
grant all on public.applications to service_role;
alter table public.applications enable row level security;
create policy "recruiter reads applicants" on public.applications for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and j.recruiter_id = auth.uid()));
create policy "candidate reads own application" on public.applications for select to authenticated
  using (auth.uid() = candidate_user_id);
create policy "recruiter adds applicants" on public.applications for insert to authenticated
  with check (exists (select 1 from public.jobs j where j.id = job_id and j.recruiter_id = auth.uid()));
create policy "candidate applies to open job" on public.applications for insert to authenticated
  with check (auth.uid() = candidate_user_id and exists (select 1 from public.jobs j where j.id = job_id and j.is_open));
create policy "recruiter updates applicants" on public.applications for update to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and j.recruiter_id = auth.uid()));
create policy "recruiter deletes applicants" on public.applications for delete to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and j.recruiter_id = auth.uid()));