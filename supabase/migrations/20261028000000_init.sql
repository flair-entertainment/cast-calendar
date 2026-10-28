-- Cast Calendar: first version of the database.
-- Plain English: four tables (managers, cast, dated availability, regular week)
-- and the security rules that stop cast seeing anyone else's data.

-- ============ TABLES ============

-- Managers who can see everyone. Add a manager by inserting their email here.
create table public.app_admins (
  email text primary key check (email = lower(email))  -- always lower case
);

create table public.cast_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null, -- their login
  full_name text not null,
  email text not null check (email = lower(email)),  -- always lower case
  phone text,
  role text not null default 'dancer',      -- list lives in lib/config.ts
  location text not null default 'UK',      -- list lives in lib/config.ts
  skills text[] not null default '{}',
  active boolean not null default true,
  is_test boolean not null default false,   -- fake test data, safe to delete
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index cast_members_email_unique on public.cast_members (lower(email));

-- One row per person per date. A date with no row counts as available.
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  cast_member_id uuid not null references public.cast_members (id) on delete cascade,
  date date not null,
  status text not null check (status in ('available', 'maybe', 'unavailable')),
  start_time time,
  end_time time,
  note text,
  updated_at timestamptz not null default now(),
  unique (cast_member_id, date)
);
create index availability_date_idx on public.availability (date);

-- Repeating weekly commitments, e.g. day job Mon-Fri 09:00-17:00.
-- days: 0 = Sunday, 1 = Monday ... 6 = Saturday.
create table public.regular_week (
  id uuid primary key default gen_random_uuid(),
  cast_member_id uuid not null references public.cast_members (id) on delete cascade,
  days smallint[] not null check (cardinality(days) > 0 and days <@ array[0,1,2,3,4,5,6]::smallint[]),
  start_time time not null,
  end_time time not null check (end_time > start_time),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index regular_week_member_idx on public.regular_week (cast_member_id);

-- ============ HELPER FUNCTIONS ============

-- Is the logged-in person a manager? Checked inside the database.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.app_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- The cast_members id of the logged-in person (null for managers who aren't cast).
create or replace function public.my_cast_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.cast_members where user_id = auth.uid();
$$;

-- ============ SECURITY (Row Level Security) ============

alter table public.app_admins enable row level security;    -- no policies: only server code can read it
alter table public.cast_members enable row level security;
alter table public.availability enable row level security;
alter table public.regular_week enable row level security;

-- Nobody who isn't logged in can touch anything.
revoke all on public.app_admins, public.cast_members, public.availability, public.regular_week from anon;
revoke all on public.app_admins from authenticated;

-- cast_members: see your own row; managers see all.
create policy "cast see own, managers see all" on public.cast_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Cast can edit only their own row, and only these columns.
-- Role, active and email are changed by managers through server code.
create policy "cast edit own" on public.cast_members
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
revoke insert, update, delete on public.cast_members from authenticated;
grant update (full_name, phone, skills, location) on public.cast_members to authenticated;

-- availability: cast manage their own; managers can read everyone's.
create policy "availability read" on public.availability
  for select to authenticated
  using (cast_member_id = public.my_cast_member_id() or public.is_admin());
create policy "availability insert own" on public.availability
  for insert to authenticated
  with check (cast_member_id = public.my_cast_member_id());
create policy "availability update own" on public.availability
  for update to authenticated
  using (cast_member_id = public.my_cast_member_id())
  with check (cast_member_id = public.my_cast_member_id());
create policy "availability delete own" on public.availability
  for delete to authenticated
  using (cast_member_id = public.my_cast_member_id());

-- regular_week: same rules as availability.
create policy "week read" on public.regular_week
  for select to authenticated
  using (cast_member_id = public.my_cast_member_id() or public.is_admin());
create policy "week insert own" on public.regular_week
  for insert to authenticated
  with check (cast_member_id = public.my_cast_member_id());
create policy "week update own" on public.regular_week
  for update to authenticated
  using (cast_member_id = public.my_cast_member_id())
  with check (cast_member_id = public.my_cast_member_id());
create policy "week delete own" on public.regular_week
  for delete to authenticated
  using (cast_member_id = public.my_cast_member_id());

-- ============ AUTOMATIC "LAST UPDATED" ============
-- Only changes made by the performer themselves count, so a manager
-- editing someone's role doesn't hide that the performer is out of date.

create or replace function public.touch_cast_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.cast_members
     set last_updated = now()
   where id = coalesce(new.cast_member_id, old.cast_member_id)
     and user_id = auth.uid();
  return null;
end;
$$;

create trigger availability_touch after insert or update or delete on public.availability
  for each row execute function public.touch_cast_member();
create trigger regular_week_touch after insert or update or delete on public.regular_week
  for each row execute function public.touch_cast_member();

create or replace function public.cast_self_update()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and new.user_id = auth.uid() then
    new.last_updated := now();
  end if;
  return new;
end;
$$;
create trigger cast_members_self_update before update on public.cast_members
  for each row execute function public.cast_self_update();

-- ============ LINK LOGINS TO CAST ============
-- When a login is created for an email on the cast list (or a cast member is
-- added whose login already exists), connect the two automatically.

create or replace function public.link_login_to_cast()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.cast_members
     set user_id = new.id
   where lower(email) = lower(new.email) and user_id is null;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.link_login_to_cast();

create or replace function public.link_cast_to_login()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is null then
    select id into new.user_id from auth.users where lower(email) = lower(new.email) limit 1;
  end if;
  return new;
end;
$$;
create trigger cast_members_link_login before insert on public.cast_members
  for each row execute function public.link_cast_to_login();
