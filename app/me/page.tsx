import { CastNav } from "@/components/CastNav";
import { requireCast } from "@/lib/auth";
import { monthDays, todayLondon } from "@/lib/availability";
import { MyCalendar } from "./MyCalendar";

export default async function MyAvailability({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { supabase, member } = await requireCast();
  const today = todayLondon();
  const { m } = await searchParams;
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : today.slice(0, 7);
  const days = monthDays(month);
  const { data: rows } = await supabase
    .from("availability")
    .select("date, status, note")
    .eq("cast_member_id", member.id)
    .gte("date", days[0])
    .lte("date", days[days.length - 1]);

  return (
    <>
      <CastNav active="/me" name={member.full_name} />
      <main className="mx-auto max-w-xl px-4 py-5">
        <MyCalendar key={month} month={month} today={today} rows={rows ?? []} />
      </main>
    </>
  );
}
