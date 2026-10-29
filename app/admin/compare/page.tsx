import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { addDays, cellFor, getWindow, groupWeeks, indexRows, isAvailable, monthDays, monthLabel, range, shiftMonth, todayLondon, ukDate, type WeekRow } from "@/lib/availability";
import { describe, TIME_WINDOWS, type WindowKey } from "@/lib/config";
import { getAvailability, getCast, getWeeks } from "@/lib/data";
import { qs } from "@/lib/qs";
import { CompareGrid } from "./CompareGrid";

type SP = { ids?: string; start?: string; span?: string; win?: string; cs?: string; ce?: string; all?: string };
const UUID = /^[0-9a-f-]{36}$/i;

// The time-of-day toggle at the top. "full" is shown as "Any time".
const TOGGLE: { key: WindowKey; label: string; hint: string }[] = [
  { key: "full", label: "Any time", hint: `${TIME_WINDOWS.full.start} to ${TIME_WINDOWS.full.end}` },
  { key: "day", label: "Daytime", hint: `${TIME_WINDOWS.day.start} to ${TIME_WINDOWS.day.end}` },
  { key: "eve", label: "Evenings", hint: `${TIME_WINDOWS.eve.start} to ${TIME_WINDOWS.eve.end}` },
  { key: "custom", label: "Custom hours", hint: "" },
];

export default async function Compare({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const ids = (sp.ids ?? "").split(",").filter((x) => UUID.test(x)).slice(0, 150);
  const today = todayLondon();
  const span = sp.span === "month" ? "month" : "2w";
  const start = sp.start && /^\d{4}-\d{2}-\d{2}$/.test(sp.start) ? sp.start : today;
  const days = span === "month" ? monthDays(start.slice(0, 7)) : range(start, 14);
  const winKey = (["full", "day", "eve", "custom"].includes(sp.win ?? "") ? sp.win : "full") as WindowKey;
  const win = getWindow(winKey, sp.cs, sp.ce);
  const params: Record<string, string | undefined> = { ids: ids.join(","), start, span, win: winKey, cs: sp.cs, ce: sp.ce, all: sp.all };

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
  const idx = indexRows(rows);
  const wk = groupWeeks(weeks);
  const people = cast.map((c) => ({
    id: c.id,
    name: c.full_name,
    desc: describe(c),
    isNew: !c.confirmed,
    cells: days.map((d) => cellFor(d, idx.get(`${c.id}|${d}`), (wk.get(c.id) ?? []) as WeekRow[], win)),
  }));
  const N = people.length;
  const counts = days.map((_, i) => people.filter((p) => isAvailable(p.cells[i])).length);
  const everyone = counts.filter((n) => n === N).length;
  const highlight = sp.all === "1";

  const prev = span === "month" ? `${shiftMonth(start.slice(0, 7), -1)}-01` : addDays(start, -14);
  const next = span === "month" ? `${shiftMonth(start.slice(0, 7), 1)}-01` : addDays(start, 14);
  const months = [...new Set(days.map((d) => d.slice(0, 7)))].map(monthLabel).join(" / ");

  return (
    <>
      <AdminNav active="/admin/compare" />
      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <p className="text-sm text-muted">Comparing {N} {N === 1 ? "person" : "people"} · <Link href="/admin/cast" className="underline">Change people</Link></p>
            <h1 className="font-serif text-4xl">{months}</h1>
            <p className="text-sm text-muted">{ukDate(days[0])} to {ukDate(days[days.length - 1])}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={qs("/admin/compare", params, { start: prev })} className="rounded-lg border border-line bg-white px-3 py-2">‹ Earlier</Link>
            <Link href={qs("/admin/compare", params, { start: span === "month" ? `${today.slice(0, 7)}-01` : today })} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">Today</Link>
            <Link href={qs("/admin/compare", params, { start: next })} className="rounded-lg border border-line bg-white px-3 py-2">Later ›</Link>
            <div className="flex rounded-lg bg-beige p-0.5 text-sm">
              <Link href={qs("/admin/compare", params, { span: "2w" })} className={`px-3 py-1.5 rounded-md ${span === "2w" ? "bg-white font-medium" : ""}`}>2 weeks</Link>
              <Link href={qs("/admin/compare", params, { span: "month", start: `${start.slice(0, 7)}-01` })} className={`px-3 py-1.5 rounded-md ${span === "month" ? "bg-white font-medium" : ""}`}>Month</Link>
            </div>
          </div>
        </div>

        {/* Time of day toggle */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-muted">Free for</span>
          <div className="flex flex-wrap rounded-xl bg-char p-1">
            {TOGGLE.map((t) => (
              <Link
                key={t.key}
                href={qs("/admin/compare", params, { win: t.key })}
                className={`rounded-lg px-4 py-2 text-sm ${winKey === t.key ? "bg-beige text-ink font-semibold" : "text-beige/80 hover:text-white"}`}
              >
                {t.label}{t.hint && <span className="ml-1.5 text-xs opacity-70">{t.hint}</span>}
              </Link>
            ))}
          </div>
          {winKey === "custom" && (
            <form className="flex items-center gap-2">
              {Object.entries({ ids: ids.join(","), start, span, all: sp.all, win: "custom" }).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
              <input type="time" name="cs" defaultValue={sp.cs ?? "18:00"} className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm" />
              <span className="text-sm">to</span>
              <input type="time" name="ce" defaultValue={sp.ce ?? "21:00"} className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm" />
              <button className="rounded-lg bg-char text-beige px-3 py-1.5 text-sm">Apply</button>
            </form>
          )}
          <Link href={qs("/admin/compare", params, { all: highlight ? undefined : "1" })} className={`ml-auto rounded-lg px-3 py-2 text-sm border ${highlight ? "bg-char text-beige border-char" : "bg-white border-line"}`}>
            {highlight ? "✓ " : ""}Highlight days everyone is free ({everyone})
          </Link>
        </div>

        <CompareGrid days={days} people={people} counts={counts} highlight={highlight} today={today} winLabel={win.label} />
      </main>
    </>
  );
}
