-- Rehearsals: managers add them and choose who's called.
-- Each performer can see only the rehearsals they're called to, and can't change them.

create table public.rehearsals (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 120),
  date date not null,
  start_time time not null,
  end_time time not null,
  location text check (length(location) <= 200),
  notes text check (length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index rehearsals_date on public.rehearsals (date);

create table public.rehearsal_cast (
  rehearsal_id uuid not null references public.rehearsals (id) on delete cascade,
  cast_member_id uuid not null references public.cast_members (id) on delete cascade,
  primary key (rehearsal_id, cast_member_id)
);
create index rehearsal_cast_member on public.rehearsal_cast (cast_member_id);

alter table public.rehearsals enable row level security;
alter table public.rehearsal_cast enable row level security;

revoke all on public.rehearsals, public.rehearsal_cast from anon;
-- Logged-in people can only read; managers make changes through server code.
revoke insert, update, delete on public.rehearsals, public.rehearsal_cast from authenticated;

-- Is the logged-in performer called to this rehearsal?
create or replace function public.called_to(r uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.rehearsal_cast
    where rehearsal_id = r and cast_member_id = public.my_cast_member_id()
  );
$$;

create policy "rehearsals: called cast and managers" on public.rehearsals
  for select to authenticated
  using (public.is_admin() or public.called_to(id));

create policy "rehearsal_cast: own rows and managers" on public.rehearsal_cast
  for select to authenticated
  using (public.is_admin() or cast_member_id = public.my_cast_member_id());
