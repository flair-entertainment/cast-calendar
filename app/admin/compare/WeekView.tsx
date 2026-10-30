"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DOW, cellFor, fmtMin, hhmm, monthLabel, shortDate, toMin, weekday } from "@/lib/availability";
import type { PersonData } from "./CompareGrid";

// Google Calendar-style week: days across, hours down. Each person has a strip in every
// day: green where they're free, red (with their name) where they're busy.
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


  const link = (start: string, span = "week") => `/admin/compare?ids=${ids.join(",")}&span=${span}&start=${start}`;
  const months = [...new Set(days.map((d) => d.slice(0, 7)))].map(monthLabel).join(" / ");


  const picked = pick ? grid[pick.d][SLOTS.indexOf(pick.s)] : null;

  // Busy blocks per day: part-day marks (red/amber) and regular week (grey), one lane per person.
  const lanes = Math.max(1, shown.length);
  const blocks = days.map((d) =>
    shown.flatMap((p, lane) => {
      const who = p.name.split(" ")[0];
      const out: { s: number; e: number; kind: "busy" | "maybe" | "regular"; label: string; who: string; lane: number }[] = [];
      const r = p.rows[d];
      if (r && r.status !== "available" && r.start_time && r.end_time) {
        out.push({ s: toMin(r.start_time), e: toMin(r.end_time), kind: r.status === "maybe" ? "maybe" : "busy", label: `${hhmm(r.start_time)}–${hhmm(r.end_time)}${r.note ? ` ${r.note}` : ""}`, who, lane });
      }
      if (r && r.status !== "available" && !r.start_time) {
        out.push({ s: START, e: END, kind: r.status === "maybe" ? "maybe" : "busy", label: r.note || "All day", who, lane });
      } else {
        for (const w of p.weeks) if (w.days.includes(weekday(d))) out.push({ s: toMin(w.start_time), e: toMin(w.end_time), kind: "regular", label: w.note || "", who, lane });
      }
      // Draw regular commitments first so busy marks sit on top.
      return out.sort((x, y) => (x.kind === "regular" ? 0 : 1) - (y.kind === "regular" ? 0 : 1));
    }),
  );

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

              {/* Time grid: hour labels, then one column per day with busy blocks on top */}
              <div className="relative" style={{ height: SLOTS.length * ROW }}>
                {SLOTS.filter((s) => s % 60 === 0).map((s) => (
                  <span key={s} className={`absolute right-1 text-[10px] text-muted ${s === START ? "" : "-translate-y-1.5"}`} style={{ top: (s - START) / STEP * ROW }}>{fmtMin(s)}</span>
                ))}
              </div>
              {days.map((d, di) => (
                <div key={d} className="relative border-l border-line" style={{ height: SLOTS.length * ROW }}>
                  {SLOTS.map((s, si) => {
                    const free = grid[di][si].filter((x) => x.st === "free").length;
                    const active = pick && pick.d === di && pick.s === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setPick({ d: di, s })}
                        title={`${shortDate(d)} ${fmtMin(s)}: ${free} of ${N} free`}
                        className={`absolute inset-x-0 z-10 ${s % 60 === 0 ? "border-t border-t-black/10" : ""} ${active ? "outline outline-2 -outline-offset-2 outline-char" : ""}`}
                        style={{ top: si * ROW, height: ROW }}
                      />
                    );
                  })}
                  {/* One strip per person: green = free */}
                  {shown.map((p, lane) => (
                    <div
                      key={p.id}
                      className="pointer-events-none absolute top-0 bottom-0 overflow-hidden rounded bg-[#d7ecdf] px-1 pt-0.5 text-[10px] font-semibold text-[#1d5c3a]"
                      style={{ left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}
                    >
                      {p.name.split(" ")[0]}
                    </div>
                  ))}
                  {/* Busy times on top: red, with the name */}
                  {blocks[di].map((bl, i) => (
                    <div
                      key={i}
                      className="pointer-events-none absolute overflow-hidden rounded bg-[#c2463e] px-1 py-0.5 text-[10px] leading-tight text-white"
                      style={{
                        top: (Math.max(bl.s, START) - START) / STEP * ROW + 1,
                        height: Math.max(ROW - 2, (Math.min(bl.e, END) - Math.max(bl.s, START)) / STEP * ROW - 2),
                        left: `calc(${(bl.lane / lanes) * 100}% + 2px)`,
                        width: `calc(${100 / lanes}% - 4px)`,
                      }}
                    >
                      <span className="font-semibold">{bl.who}</span> {bl.kind === "maybe" ? "Maybe " : ""}{bl.label}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
