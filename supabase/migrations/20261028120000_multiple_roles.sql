-- Performers can have more than one role (e.g. dancer and actor),
-- and location can be left blank until we know it.

alter table public.cast_members add column roles text[] not null default '{}';
update public.cast_members set roles = array[role] where role is not null and role <> '';
alter table public.cast_members drop column role;

alter table public.cast_members alter column location drop not null;
alter table public.cast_members alter column location drop default;
