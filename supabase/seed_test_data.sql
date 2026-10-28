-- 300 FAKE test cast members with random availability for the next 3 months.
-- Everything here is marked is_test = true. To remove it all later, run:
--   delete from public.cast_members where is_test;
-- (their availability and regular weeks are deleted with them)

with first_names as (
  select array['Ava','Ben','Chloe','Dev','Ellie','Finn','Grace','Harry','Isla','Jonah','Kara','Luca','Maya','Nia','Owen','Priya','Rosa','Sam','Tia','Zac'] as a
), last_names as (
  select array['Morgan','Okafor','Hart','Patel','Rowe','Gallagher','Liu','Noble','Brennan','Reid','Mensah','Romano','Lindqvist','Campbell','Hughes','Shah','Ellis','Quinn','Byrne','Ward'] as a
), skill_pool as (
  select array['aerial hoop','silks','stilts','fire','tap','ballet','hip hop','harmonies','improv','magic','juggling','walkabout'] as a
)
insert into public.cast_members (full_name, email, phone, role, location, skills, active, is_test, last_updated)
select
  'TEST ' || f.a[1 + (n * 7) % 20] || ' ' || l.a[1 + (n * 13) % 20],
  'test' || lpad(n::text, 3, '0') || '@example.invalid',
  '07700 900' || lpad((n % 1000)::text, 3, '0'),
  (array['dancer','specialist','actor','singer'])[1 + floor(random() * 4)::int],
  (array['UK','UK','UK','Jersey','Europe'])[1 + floor(random() * 5)::int],
  array[s.a[1 + floor(random() * 12)::int], s.a[1 + floor(random() * 12)::int]],
  random() > 0.08,
  true,
  now() - (floor(random() * 120) || ' days')::interval
from generate_series(1, 300) as n, first_names f, last_names l, skill_pool s;

-- Scattered single days: some unavailable, some maybe, some confirmed available.
insert into public.availability (cast_member_id, date, status, note)
select id, day,
  case when r < 0.10 then 'unavailable' when r < 0.14 then 'maybe' else 'available' end,
  case when r < 0.10 then (array['Other work','Personal','Wedding','Exam'])[1 + floor(random() * 4)::int] end
from (
  select c.id, d::date as day, random() as r
  from public.cast_members c
  cross join generate_series(current_date, current_date + 90, interval '1 day') as d
  where c.is_test
) x
where x.r < 0.20
on conflict (cast_member_id, date) do nothing;

-- Holidays: about a third of people have a 3 to 10 day block off.
insert into public.availability (cast_member_id, date, status, note)
select c.id, d::date, 'unavailable', 'Holiday'
from (
  select id, current_date + floor(random() * 80)::int as start_day, 3 + floor(random() * 8)::int as len
  from public.cast_members where is_test and random() < 0.33
) c
cross join lateral generate_series(c.start_day, c.start_day + c.len - 1, interval '1 day') as d
on conflict (cast_member_id, date) do update set status = 'unavailable', note = 'Holiday';

-- Regular weeks: day jobs and evening classes.
insert into public.regular_week (cast_member_id, days, start_time, end_time, note)
select id, '{1,2,3,4,5}', '09:00', '17:00', 'Day job'
from public.cast_members where is_test and random() < 0.35;

insert into public.regular_week (cast_member_id, days, start_time, end_time, note)
select id, '{2,4}', '18:00', '21:00', 'Evening classes'
from public.cast_members where is_test and random() < 0.15;
