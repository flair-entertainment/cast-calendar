import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { TimeControls } from "@/components/TimeControls";
import { requireAdmin } from "@/lib/auth";
import { cellFor, getWindow, groupWeeks, indexRows, isAvailable, monthDays, monthLabel, shiftMonth, shortDate, todayLondon, weekday } from "@/lib/availability";
import { describe, type WindowKey } from "@/lib/config";
import { getAvailability, getCast, getWeeks } from "@/lib/data";
import { qs } from "@/lib/qs";

type SP = { m?: string; win?: string; cs?: string; ce?: string; d?: string };

export default async function Overview({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const today = todayLondon();
  const month = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : today.slice(0, 7);
  const winKey = (["full", "day", "eve", "custom"].includes(sp.win ?? "") ? sp.win : "full") as WindowKey;
  const win = getWindow(winKey, sp.cs, sp.ce);
  const days = monthDays(month);

  const [allActive, rows, weeks] = await Promise.all([
    getCast(supabase, { activeOnly: true }),
    getAvailability(supabase, days[0], days[days.length - 1]),
    getWeeks(supabase),
  ]);
  const cast = allActive.filter((c) => c.confirmed);
  const unconfirmed = allActive.length - cast.length;
  const idx = indexRows(rows);
  const wk = groupWeeks(weeks);
  const N = cast.length;
  const counts = new Map(days.map((d) => [d, cast.filter((c) => isAvailable(cellFor(d, idx.get(`${c.id}|${d}`), wk.get(c.id) ?? [], win))).length]));
  const offset = (weekday(days[0]) + 6) % 7;
  const params: Record<string, string | undefined> = { m: month, win: winKey, cs: sp.cs, ce: sp.ce };

  const sel = sp.d && days.includes(sp.d) ? sp.d : null;
  const groups = sel
    ? (() => {
        const cells = cast.map((c) => ({ c, cell: cellFor(sel, idx.get(`${c.id}|${sel}`), wk.get(c.id) ?? [], win) }));
        return [
          { title: "Available", tone: "text-green-800", list: cells.filter((x) => isAvailable(x.cell)) },
          { title: "Partly free", tone: "text-amber-700", list: cells.filter((x) => x.cell.st === "part") },
          { title: "Maybe", tone: "text-amber-700", list: cells.filter((x) => x.cell.st === "maybe") },
          { title: "Unavailable", tone: "text-red-700", list: cells.filter((x) => x.cell.st === "out") },
        ];
      })()
    : null;

  const shade = (n: number) => {
    const r = N ? n / N : 0;
    return r >= 0.75 ? "st-free" : r >= 0.5 ? "bg-white" : r >= 0.25 ? "st-part" : "bg-red-100";
  };

  return (
    <>
      <AdminNav active="/admin" />
      <main className="mx-auto max-w-7xl px-4 py-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
            <div>
              <h1 className="font-serif text-3xl">Overview</h1>
              <p className="text-sm text-muted">How many of the {N} active, confirmed cast are available each day · {win.label}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href={qs("/admin", params, { m: shiftMonth(month, -1), d: undefined })} className="rounded-lg border border-line bg-white px-3 py-1.5">‹</Link>
              <span className="min-w-36 text-center font-semibold">{monthLabel(month)}</span>
              <Link href={qs("/admin", params, { m: shiftMonth(month, 1), d: undefined })} className="rounded-lg border border-line bg-white px-3 py-1.5">›</Link>
            </div>
          </div>
          {unconfirmed > 0 && (
            <Link href="/admin/cast?new=1" className="mb-4 block rounded-lg bg-char text-beige px-4 py-3 text-sm hover:opacity-90">
              <b>{unconfirmed} new sign-up{unconfirmed === 1 ? " isn't" : "s aren't"} counted here yet.</b> Confirm them on the Cast list to include them. →
            </Link>
          )}
          {N === 0 && unconfirmed === 0 && (
            <p className="mb-4 rounded-lg bg-white border border-line px-4 py-3 text-sm">No active performers yet. Once performers sign up and you confirm them, they'll be counted here.</p>
          )}
          <div className="mb-4"><TimeControls hidden={{ m: month }} win={winKey} cs={sp.cs} ce={sp.ce} /></div>
          <div className="grid grid-cols-7 gap-1.5 text-xs uppercase tracking-wide text-muted mb-1.5">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="px-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: offset }).map((_, i) => <div key={i} />)}
            {days.map((d) => (
              <Link
                key={d}
                href={qs("/admin", params, { d })}
                className={`min-h-20 rounded-lg border p-2 flex flex-col justify-between ${shade(counts.get(d)!)} ${sel === d ? "ring-2 ring-char border-char" : "border-line"} ${d < today ? "opacity-50" : ""}`}
              >
                <span className={`text-sm font-semibold ${d === today ? "underline" : ""}`}>{Number(d.slice(8))}</span>
                <span className="text-sm"><b className="text-lg">{counts.get(d)}</b><span className="text-muted">/{N}</span></span>
              </Link>
            ))}
          </div>
        </section>

        <aside className="rounded-xl bg-white border border-line p-4 h-fit lg:sticky lg:top-4 max-h-[85vh] overflow-auto">
          {!sel || !groups ? (
            <p className="text-sm text-muted">Click a day to see who's available, with their role and skills.</p>
          ) : (
            <>
              <h2 className="font-serif text-xl">{shortDate(sel)}</h2>
              <p className="text-xs text-muted mb-3">{win.label}</p>
              {groups.filter((g) => g.list.length).map((g) => (
                <div key={g.title} className="mb-4">
                  <h3 className={`text-xs uppercase tracking-wide font-semibold mb-1 ${g.tone}`}>{g.title} · {g.list.length}</h3>
                  <ul className="divide-y divide-line">
                    {g.list.map(({ c, cell }) => (
                      <li key={c.id} className="py-1.5 text-sm">
                        <Link href={`/admin/cast/${c.id}`} className="font-medium hover:underline">{c.full_name}</Link>
                        <div className="text-xs text-muted">{describe(c)}</div>
                        {cell.why && <div className="text-xs text-muted">{cell.why}</div>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </aside>
      </main>
    </>
  );
}
