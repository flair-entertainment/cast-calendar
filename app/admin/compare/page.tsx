import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { addDays, monthDays, range, shiftMonth, todayLondon, type AvailabilityRow, type WeekRow } from "@/lib/availability";
import { describe, type WindowKey } from "@/lib/config";
import { getAvailability, getCast, getWeeks } from "@/lib/data";
import { CompareGrid, type PersonData } from "./CompareGrid";

type SP = { ids?: string; start?: string; span?: string; win?: string; cs?: string; ce?: string; all?: string };
const UUID = /^[0-9a-f-]{36}$/i;

// Loads the selected people and their dates. Everything else (time-of-day toggle,
// highlighting, tapping for reasons) happens instantly in the browser.
export default async function Compare({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const ids = (sp.ids ?? "").split(",").filter((x) => UUID.test(x)).slice(0, 150);
  const today = todayLondon();
  const span = sp.span === "month" ? "month" : "2w";
  const start = sp.start && /^\d{4}-\d{2}-\d{2}$/.test(sp.start) ? sp.start : today;
  const days = span === "month" ? monthDays(start.slice(0, 7)) : range(start, 14);
  const winKey = (["full", "day", "eve", "custom"].includes(sp.win ?? "") ? sp.win : "full") as WindowKey;

  if (!ids.length) {
    return (
      <>
        <AdminNav active="/admin/compare" />
        <main className="mx-auto max-w-7xl px-4 py-10 text-center">
          <h1 className="font-serif text-3xl mb-2">Compare</h1>
          <p className="text-muted mb-4">Pick the people you want to compare on the Cast list first.</p>
          <Link href="/admin/cast" className="rounded-lg bg-char text-beige px-4 py-2 font-semibold">Go to Cast list</Link>
        </main>
      </>
    );
  }

  const [cast, rows, weeks] = await Promise.all([
    getCast(supabase, { ids }),
    getAvailability(supabase, days[0], days[days.length - 1], ids),
    getWeeks(supabase, ids),
  ]);
  const people: PersonData[] = cast.map((c) => ({
    id: c.id,
    name: c.full_name,
    desc: describe(c),
    isNew: !c.confirmed,
    rows: Object.fromEntries(rows.filter((r) => r.cast_member_id === c.id).map((r) => [r.date, r])) as Record<string, AvailabilityRow>,
    weeks: weeks.filter((w) => w.cast_member_id === c.id) as WeekRow[],
  }));

  const nav = {
    prev: span === "month" ? `${shiftMonth(start.slice(0, 7), -1)}-01` : addDays(start, -14),
    next: span === "month" ? `${shiftMonth(start.slice(0, 7), 1)}-01` : addDays(start, 14),
    today: span === "month" ? `${today.slice(0, 7)}-01` : today,
    monthStart: `${start.slice(0, 7)}-01`,
  };

  return (
    <>
      <AdminNav active="/admin/compare" />
      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <CompareGrid
          ids={ids}
          days={days}
          people={people}
          today={today}
          span={span}
          nav={nav}
          initialWin={winKey}
          initialCs={sp.cs ?? "18:00"}
          initialCe={sp.ce ?? "21:00"}
          initialHighlight={sp.all === "1"}
        />
      </main>
    </>
  );
}
