-- Performers can sign themselves up with a join code.
-- Self sign-ups are marked as not yet confirmed until a manager confirms them.
-- Everyone already on the list (imported by managers) counts as confirmed.

alter table public.cast_members add column confirmed boolean not null default true;
alter table public.cast_members add column self_signup boolean not null default false;
-- Performers can't change these themselves: they are not in the column grant
-- (full_name, phone, skills, location), so only managers' server code can.
