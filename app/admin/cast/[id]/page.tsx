import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { addDays, daysBetween, daysLabel, hhmm, isStale, monthDays, monthLabel, shiftMonth, shortDate, toMin, todayLondon, ukDate, weekday, DOW, MON_FIRST, type AvailabilityRow, type WeekRow } from "@/lib/availability";
import { LOCATIONS, ROLES, STALE_DAYS, cap, describe } from "@/lib/config";
import { getAvailability } from "@/lib/data";
import { updateCastAdmin } from "../../actions";

const STYLE: Record<string, string> = { unavailable: "st-out", maybe: "st-maybe", available: "st-confirmed" };

export default async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: c } = await supabase.from("cast_members").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const today = todayLondon();
  const end = addDays(today, 183);
  const [{ data: weeks }, rows] = await Promise.all([
    supabase.from("regular_week").select("*").eq("cast_member_id", id).order("created_at"),
    getAvailability(supabase, today, end, [id]),
  ]);
  const week = (weeks ?? []) as WeekRow[];
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const upcoming = groupRuns(rows.filter((r) => r.status !== "available"));
  const stale = isStale(c.last_updated, today, STALE_DAYS);
  const ago = daysBetween(c.last_updated.slice(0, 10), today);
  const months = [today.slice(0, 7), shiftMonth(today.slice(0, 7), 1)];

  return (
    <>
      <AdminNav active="/admin/cast" />
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-5">
        <Link href="/admin/cast" className="text-sm underline text-muted">← Cast list</Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl">{c.full_name}{c.is_test && <span className="ml-2 align-middle text-xs rounded bg-beige px-1.5">TEST</span>}{!c.confirmed && <span className="ml-2 align-middle text-xs font-semibold rounded bg-char text-beige px-1.5">NEW</span>}</h1>
            <p className="text-muted">{describe(c)}</p>
            <p className="text-sm mt-1">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
          </div>
          <div className={`rounded-lg px-3 py-2 text-sm ${stale ? "bg-amber-100 text-amber-900" : "bg-white border border-line"}`}>
            Last updated {ukDate(c.last_updated.slice(0, 10))} ({ago} day{ago === 1 ? "" : "s"} ago)
            {stale && <div className="text-xs">Out of date: a blank calendar may not be reliable. Check before casting.</div>}
          </div>
        </div>

        {!c.confirmed && (
          <div className="rounded-xl bg-char text-beige p-4 text-sm">
            <b>New sign-up.</b> {c.full_name} signed themselves up with the join code. If they&apos;re a genuine Flair performer, tick <b>Confirmed</b> below and save. If not, untick <b>Active</b> to switch off their access.
          </div>
        )}

        <section className="rounded-xl bg-white border border-line p-4">
          <h2 className="text-xs uppercase tracking-wide text-muted mb-3">Regular week</h2>
          <WeekBars week={week} />
          {week.length ? (
            <ul className="mt-3 divide-y divide-line text-sm">
              {week.map((w) => <li key={w.id} className="py-1.5"><b>{w.note || "Regular commitment"}</b> · {daysLabel(w.days)} · {hhmm(w.start_time)} to {hhmm(w.end_time)}</li>)}
            </ul>
          ) : <p className="text-sm text-muted mt-2">No regular commitments.</p>}
        </section>

        <section className="rounded-xl bg-white border border-line p-4">
          <h2 className="text-xs uppercase tracking-wide text-muted mb-3">Upcoming dates they can't do or might not (next 6 months)</h2>
          {upcoming.length ? (
            <ul className="divide-y divide-line text-sm">
              {upcoming.map((u) => (
                <li key={u.from} className="py-1.5 flex justify-between gap-3">
                  <span>{u.from === u.to ? shortDate(u.from) : `${shortDate(u.from)} to ${shortDate(u.to)}`}{u.note ? ` · ${u.note}` : ""}</span>
                  <span className={`rounded px-2 text-xs ${STYLE[u.status]}`}>{u.status === "unavailable" ? "Unavailable" : "Maybe"}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">Nothing marked.</p>}
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {months.map((m) => <MiniMonth key={m} month={m} byDate={byDate} today={today} />)}
        </section>

        <form action={updateCastAdmin} className="rounded-xl bg-white border border-line p-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={c.id} />
          <fieldset className="text-xs text-muted">Roles
            <div className="mt-1 flex flex-wrap gap-1.5">
              {ROLES.map((r) => (
                <label key={r} className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-sm text-ink"><input type="checkbox" name="roles" value={r} defaultChecked={c.roles.includes(r)} />{cap(r)}</label>
              ))}
            </div>
          </fieldset>
          <label className="text-xs text-muted">Location<select name="location" defaultValue={c.location ?? ""} className="mt-1 block rounded-lg border border-line px-2 py-1.5 text-sm text-ink"><option value="">Not set</option>{LOCATIONS.map((l) => <option key={l}>{l}</option>)}</select></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirmed" defaultChecked={c.confirmed} />Confirmed</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={c.active} />Active</label>
          <button className="rounded-lg bg-char text-beige px-4 py-1.5 text-sm font-semibold">Save</button>
        </form>
      </main>
    </>
  );
}

function groupRuns(rows: AvailabilityRow[]) {
  const out: { from: string; to: string; status: string; note: string | null }[] = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && last.status === r.status && (last.note ?? "") === (r.note ?? "") && addDays(last.to, 1) === r.date) last.to = r.date;
    else out.push({ from: r.date, to: r.date, status: r.status, note: r.note });
  }
  return out;
}

function WeekBars({ week }: { week: WeekRow[] }) {
  const pct = (m: number) => ((Math.min(Math.max(m, 360), 1440) - 360) / 1080) * 100;
  return (
    <div className="space-y-1">
      {MON_FIRST.map((d) => (
        <div key={d} className="grid grid-cols-[36px_1fr] items-center gap-2 text-xs">
          <span>{DOW[d]}</span>
          <div className="relative h-4 rounded st-free">
            {week.filter((w) => w.days.includes(d)).map((w) => (
              <i key={w.id} className="absolute inset-y-0 rounded st-out opacity-90" style={{ left: `${pct(toMin(w.start_time))}%`, width: `${pct(toMin(w.end_time)) - pct(toMin(w.start_time))}%` }} title={`${w.note}: ${hhmm(w.start_time)} to ${hhmm(w.end_time)}`} />
            ))}
          </div>
        </div>
      ))}
      <div className="ml-11 flex justify-between text-[10px] text-muted"><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
    </div>
  );
}

function MiniMonth({ month, byDate, today }: { month: string; byDate: Map<string, AvailabilityRow>; today: string }) {
  const days = monthDays(month);
  const offset = (weekday(days[0]) + 6) % 7;
  return (
    <div className="rounded-xl bg-white border border-line p-3">
      <h3 className="font-medium mb-2">{monthLabel(month)}</h3>
      <div className="grid grid-cols-7 gap-1 text-[10px] text-center text-muted mb-1">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i}>{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => <div key={i} />)}
        {days.map((d) => {
          const r = byDate.get(d);
          return <div key={d} title={r ? `${r.status}${r.note ? `: ${r.note}` : ""}` : "Not marked"} className={`aspect-square rounded text-[11px] flex items-center justify-center ${r ? STYLE[r.status] : "st-free"} ${d < today ? "opacity-35" : ""}`}>{Number(d.slice(8))}</div>;
        })}
      </div>
    </div>
  );
}
