import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { TimeControls } from "@/components/TimeControls";
import { requireAdmin } from "@/lib/auth";
import { addDays, cellFor, getWindow, groupWeeks, indexRows, isAvailable, monthDays, monthLabel, range, shiftMonth, shortDate, todayLondon, ukDate, weekday, DOW } from "@/lib/availability";
import { describe, type WindowKey } from "@/lib/config";
import { getAvailability, getCast, getWeeks } from "@/lib/data";
import { qs } from "@/lib/qs";

type SP = { ids?: string; start?: string; span?: string; win?: string; cs?: string; ce?: string; all?: string };
const UUID = /^[0-9a-f-]{36}$/i;
const STYLE: Record<string, string> = { confirmed: "st-confirmed", free: "st-free", part: "st-part", maybe: "st-maybe", out: "st-out" };

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
  const grid = cast.map((c) => ({ c, cells: days.map((d) => cellFor(d, idx.get(`${c.id}|${d}`), wk.get(c.id) ?? [], win)) }));
  const counts = days.map((_, i) => grid.filter((g) => isAvailable(g.cells[i])).length);
  const N = cast.length;
  const everyone = days.filter((_, i) => counts[i] === N);
  const highlight = sp.all === "1";

  const prev = span === "month" ? `${shiftMonth(start.slice(0, 7), -1)}-01` : addDays(start, -14);
  const next = span === "month" ? `${shiftMonth(start.slice(0, 7), 1)}-01` : addDays(start, 14);

  return (
    <>
      <AdminNav active="/admin/compare" />
      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-3">
          <div>
            <h1 className="font-serif text-3xl">Compare {N} cast</h1>
            <p className="text-sm text-muted">{win.label} · {span === "month" ? monthLabel(start.slice(0, 7)) : `${ukDate(days[0])} to ${ukDate(days[days.length - 1])}`}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={qs("/admin/compare", params, { start: prev })} className="rounded-lg border border-line bg-white px-3 py-1.5">‹ Previous</Link>
            <Link href={qs("/admin/compare", params, { start: today, span: span })} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm">Today</Link>
            <Link href={qs("/admin/compare", params, { start: next })} className="rounded-lg border border-line bg-white px-3 py-1.5">Next ›</Link>
            <div className="flex rounded-lg bg-beige p-0.5 text-sm">
              <Link href={qs("/admin/compare", params, { span: "2w" })} className={`px-3 py-1 rounded-md ${span === "2w" ? "bg-white font-medium" : ""}`}>2 weeks</Link>
              <Link href={qs("/admin/compare", params, { span: "month", start: `${start.slice(0, 7)}-01` })} className={`px-3 py-1 rounded-md ${span === "month" ? "bg-white font-medium" : ""}`}>Month</Link>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 mb-3">
          <TimeControls hidden={{ ids: ids.join(","), start, span, all: sp.all }} win={winKey} cs={sp.cs} ce={sp.ce} />
          <Link href={qs("/admin/compare", params, { all: highlight ? undefined : "1" })} className={`rounded-lg px-3 py-1.5 text-sm border ${highlight ? "bg-char text-beige border-char" : "bg-white border-line"}`}>
            {highlight ? "✓ " : ""}Highlight days everyone is available ({everyone.length})
          </Link>
        </div>

        <div className="overflow-auto rounded-xl border border-line bg-white max-h-[75vh]">
          <table className="border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-white">
              <tr>
                <th className="sticky left-0 z-30 bg-white p-2 text-left min-w-56 border-b border-line">Cast member</th>
                {days.map((d, i) => (
                  <th key={d} className={`p-1 min-w-11 border-b border-line font-medium ${highlight && counts[i] === N ? "bg-char text-beige" : weekday(d) % 6 === 0 ? "bg-sand" : ""}`}>
                    <div>{DOW[weekday(d)].slice(0, 2)}</div>
                    <div className="text-sm">{Number(d.slice(8))}</div>
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 z-30 bg-beige p-2 text-left border-b border-line">Available</th>
                {counts.map((n, i) => (
                  <th key={i} className={`p-1 border-b border-line ${n === N ? "st-confirmed" : "bg-beige"}`}>{n}/{N}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map(({ c, cells }) => (
                <tr key={c.id}>
                  <td className="sticky left-0 z-10 bg-white p-2 border-b border-line">
                    <Link href={`/admin/cast/${c.id}`} className="font-medium text-sm hover:underline">{c.full_name}</Link>
                    <div className="text-muted">{describe(c)}</div>
                  </td>
                  {cells.map((cell, i) => (
                    <td key={i} className={`border-b border-l border-line p-0 ${highlight && counts[i] === N ? "outline outline-2 -outline-offset-2 outline-char" : ""}`}>
                      <div className={`m-0.5 h-8 rounded ${STYLE[cell.st]}`} title={`${c.full_name} · ${shortDate(days[i])}: ${cell.why || "Available (not marked)"}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-muted mt-3">
          <span><i className="inline-block w-3 h-3 rounded st-confirmed align-middle mr-1" />Confirmed available</span>
          <span><i className="inline-block w-3 h-3 rounded st-free align-middle mr-1" />Not marked (counts as available)</span>
          <span><i className="inline-block w-3 h-3 rounded st-part align-middle mr-1" />Partly free (regular week clashes)</span>
          <span><i className="inline-block w-3 h-3 rounded st-maybe align-middle mr-1" />Maybe</span>
          <span><i className="inline-block w-3 h-3 rounded st-out align-middle mr-1" />Unavailable</span>
          <span>Hover over a cell for the reason.</span>
        </div>
      </main>
    </>
  );
}
