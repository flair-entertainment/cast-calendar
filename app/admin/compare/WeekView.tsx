"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DOW, cellFor, fmtMin, monthLabel, shortDate, weekday } from "@/lib/availability";
import type { PersonData } from "./CompareGrid";

// Google Calendar-style week: days across, hours down. Each half-hour shows how many
// of the selected people are free; tap it to see who.
const START = 8 * 60; // 08:00
const END = 23 * 60; // 23:00
const STEP = 30;
const SLOTS = Array.from({ length: (END - START) / STEP }, (_, i) => START + i * STEP);
const ROW = 22; // px per half hour

type SlotState = "free" | "maybe" | "busy";
type Props = {
  ids: string[];
  days: string[];
  people: PersonData[];
  today: string;
  nav: { prev: string; next: string; today: string };
};

function slotState(p: PersonData, date: string, s: number): { st: SlotState; why: string } {
  const c = cellFor(date, p.rows[date], p.weeks, { s, e: s + STEP });
  if (c.st === "confirmed" || c.st === "free") return { st: "free", why: "" };
  if (c.st === "maybe") return { st: "maybe", why: c.why };
  return { st: "busy", why: c.why };
}

export function WeekView({ ids, days, people, today, nav }: Props) {
  // Untick people to leave them out of the counts (instant, no reload).
  const [off, setOff] = useState<Set<string>>(new Set());
  const [pick, setPick] = useState<{ d: number; s: number } | null>(null);
  const shown = people.filter((p) => !off.has(p.id));
  const N = shown.length;

  // free counts for every day x slot
  const grid = useMemo(
    () => days.map((d) => SLOTS.map((s) => shown.map((p) => ({ p, ...slotState(p, d, s) })))),
    [days, shown],
  );

  const shade = (free: number) => {
    if (!N) return "bg-white";
    if (free === N) return "st-confirmed";
    const r = free / N;
    return r >= 0.5 ? "bg-[#cfe9d8]" : r > 0 ? "bg-amber-100" : "bg-red-100";
  };

  const link = (start: string, span = "week") => `/admin/compare?ids=${ids.join(",")}&span=${span}&start=${start}`;
  const months = [...new Set(days.map((d) => d.slice(0, 7)))].map(monthLabel).join(" / ");

  // All-day row: people marked unavailable or maybe for the whole day.
  const allDay = days.map((d) =>
    shown.flatMap((p) => {
      const r = p.rows[d];
      if (!r || r.status === "available" || r.start_time) return [];
      return [{ name: p.name, st: r.status, note: r.note }];
    }),
  );

  const picked = pick ? grid[pick.d][SLOTS.indexOf(pick.s)] : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <h1 className="font-serif text-4xl">{months}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={link(nav.prev)} className="rounded-lg border border-line bg-white px-3 py-2">‹</Link>
          <Link href={link(nav.today)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">Today</Link>
          <Link href={link(nav.next)} className="rounded-lg border border-line bg-white px-3 py-2">›</Link>
          <div className="flex rounded-lg bg-beige p-0.5 text-sm">
            <span className="px-3 py-1.5 rounded-md bg-white font-medium">Week</span>
            <Link href={link(days[0], "2w")} className="px-3 py-1.5 rounded-md">2 weeks</Link>
            <Link href={link(`${days[0].slice(0, 7)}-01`, "month")} className="px-3 py-1.5 rounded-md">Month</Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        {/* People: untick to leave someone out */}
        <aside className="rounded-xl border border-line bg-white p-3 h-fit lg:sticky lg:top-4">
          <ul className="space-y-1 max-h-[60vh] overflow-auto">
            {people.map((p) => (
              <li key={p.id}>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!off.has(p.id)}
                    onChange={() => setOff((o) => { const n = new Set(o); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })}
                    className="mt-1"
                  />
                  <span>{p.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </aside>

        <div>
          {/* Info bar */}
          {pick && picked && (
          <div className="mb-3 rounded-xl border border-line bg-white px-4 py-3 text-sm">
            {(
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <b>{shortDate(days[pick.d])}, {fmtMin(pick.s)}–{fmtMin(pick.s + STEP)}</b> · {picked.filter((x) => x.st === "free").length} of {N} free
                  <button onClick={() => setPick(null)} className="ml-auto text-muted" aria-label="Close">✕</button>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  {(["free", "maybe", "busy"] as SlotState[]).map((st) => {
                    const list = picked.filter((x) => x.st === st);
                    if (!list.length) return null;
                    return (
                      <div key={st}>
                        <span className={`text-xs uppercase tracking-wide ${st === "free" ? "text-green-800" : st === "maybe" ? "text-amber-700" : "text-red-700"}`}>{st === "free" ? "Free" : st === "maybe" ? "Maybe" : "Busy"}: </span>
                        {list.map((x) => x.p.name + (x.why ? ` (${x.why.replace(/^Regular week: /, "")})` : "")).join(", ")}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          )}

          <div className="overflow-auto rounded-xl border border-line bg-white">
            <div className="grid min-w-[760px]" style={{ gridTemplateColumns: `56px repeat(7, minmax(0, 1fr))` }}>
              {/* Day headers */}
              <div className="sticky top-0 z-10 bg-white border-b border-line" />
              {days.map((d) => (
                <div key={d} className={`sticky top-0 z-10 border-b border-l border-line px-2 py-2 text-center ${weekday(d) % 6 === 0 ? "bg-sand" : "bg-white"}`}>
                  <div className="text-xs uppercase text-muted">{DOW[weekday(d)]}</div>
                  <div className={`mx-auto mt-0.5 flex h-9 w-9 items-center justify-center rounded-full text-lg ${d === today ? "bg-char text-beige font-semibold" : ""}`}>{Number(d.slice(8))}</div>
                </div>
              ))}

              {/* All-day row (holidays etc.) */}
              <div className="border-b border-line" />
              {allDay.map((list, i) => (
                <div key={i} className="border-b border-l border-line p-1 space-y-0.5 min-h-8">
                  {list.map((x) => (
                    <div key={x.name} className={`truncate rounded px-1.5 py-0.5 text-[11px] ${x.st === "unavailable" ? "st-out" : "st-maybe"}`} title={`${x.name}: ${x.st === "unavailable" ? "Unavailable" : "Maybe"}${x.note ? ` (${x.note})` : ""}`}>
                      {x.name.split(" ")[0]}{x.note ? ` · ${x.note}` : ""}
                    </div>
                  ))}
                </div>
              ))}

              {/* Time grid */}
              {SLOTS.map((s, si) => (
                <div key={s} className="contents">
                  <div className="relative border-line pr-1 text-right text-[10px] text-muted" style={{ height: ROW }}>
                    {s % 60 === 0 && <span className="relative -top-1.5">{fmtMin(s)}</span>}
                  </div>
                  {days.map((d, di) => {
                    const cell = grid[di][si];
                    const free = cell.filter((x) => x.st === "free").length;
                    const active = pick && pick.d === di && pick.s === s;
                    return (
                      <button
                        key={d}
                        onClick={() => setPick({ d: di, s })}
                        title={`${shortDate(d)} ${fmtMin(s)}: ${free} of ${N} free`}
                        className={`border-l border-line ${s % 60 === 0 ? "border-t border-t-line" : "border-t border-t-line/40"} ${shade(free)} ${active ? "outline outline-2 -outline-offset-2 outline-char" : ""} text-[10px]`}
                        style={{ height: ROW }}
                      >
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
