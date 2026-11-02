import { CastNav } from "@/components/CastNav";
import { requireCast } from "@/lib/auth";
import Link from "next/link";
import { hhmm, monthDays, shortDate, todayLondon } from "@/lib/availability";
import { getRehearsals } from "@/lib/data";
import { MyCalendar } from "./MyCalendar";

export default async function MyAvailability({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { supabase, member } = await requireCast();
  const today = todayLondon();
  const { m } = await searchParams;
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : today.slice(0, 7);
  const days = monthDays(month);
  const [{ data: rows }, { data: weeks }, rehearsals, next] = await Promise.all([
    supabase
      .from("availability")
      .select("date, status, note, start_time, end_time")
      .eq("cast_member_id", member.id)
      .gte("date", days[0])
      .lte("date", days[days.length - 1]),
    supabase.from("regular_week").select("id, cast_member_id, days, start_time, end_time, note").eq("cast_member_id", member.id),
    getRehearsals(supabase, days[0], days[days.length - 1]),
    supabase.from("rehearsals").select("title, date, start_time, end_time").gte("date", today).order("date").order("start_time").limit(1).maybeSingle(),
  ]);
  const n = next.data;

  return (
    <>
      <CastNav active="/me" name={member.full_name} />
      <main className="mx-auto max-w-xl px-4 py-5">
        {n && (
          <Link href="/me/rehearsals" className="mb-4 flex items-center gap-3 rounded-xl bg-char px-4 py-3 text-beige">
            <span className="text-xs uppercase tracking-wide text-beige/70">Next rehearsal</span>
            <span className="flex-1 truncate text-sm"><b>{shortDate(n.date)}</b> · {hhmm(n.start_time)}–{hhmm(n.end_time)} · {n.title}</span>
            <span>›</span>
          </Link>
        )}
        <MyCalendar month={month} today={today} rows={rows ?? []} weeks={weeks ?? []} rehearsals={rehearsals} />
      </main>
    </>
  );
}
