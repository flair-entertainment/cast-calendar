"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DOW, cellFor, fmtMin, hhmm, monthLabel, toMin, weekday } from "@/lib/availability";
import type { PersonData } from "./CompareGrid";

// People down the left, hours across, one day at a time. Green = free, red = busy
// (with the reason). Tap an hour to see who's free then.
const START = 8 * 60; // 08:00
const END = 24 * 60; // midnight
const HOURS = Array.from({ length: (END - START) / 60 }, (_, i) => START + i * 60);
const HOUR_W = 64; // px per hour
const ROW_H = 40;
const NAME_W = 170;

type Props = {
  ids: string[];
  days: string[];
  people: PersonData[];
  today: string;
  nav: { prev: string; next: string; today: string };
};

type Block = { s: number; e: number; label: string };

function busyBlocks(p: PersonData, d: string): Block[] {
  const r = p.rows[d];
  if (r && r.status !== "available" && !r.start_time) return [{ s: START, e: END, label: `${r.status === "maybe" ? "Maybe" : "Busy"}${r.note ? ` · ${r.note}` : " all day"}` }];
  const out: Block[] = [];
  for (const w of p.weeks) if (w.days.includes(weekday(d))) out.push({ s: toMin(w.start_time), e: toMin(w.end_time), label: w.note || "Busy" });
  if (r && r.status !== "available" && r.start_time && r.end_time) {
    out.push({ s: toMin(r.start_time), e: toMin(r.end_time), label: `${r.status === "maybe" ? "Maybe " : ""}${hhmm(r.start_time)}–${hhmm(r.end_time)}${r.note ? ` ${r.note}` : ""}` });
  }
  return out;
}

const freeAt = (p: PersonData, d: string, t: number) => {
  const c = cellFor(d, p.rows[d], p.weeks, { s: t, e: t + 60 });
  return c.st === "free" || c.st === "confirmed";
};

export function WeekView({ ids, days, people, today, nav }: Props) {
  const [day, setDay] = useState(days.includes(today) ? today : days[0]);
  const [hour, setHour] = useState<number | null>(null);

  // When an hour is picked, free people go to the top.
  const rows = useMemo(() => {
    const list = people.map((p) => ({ p, blocks: busyBlocks(p, day), free: hour !== null ? freeAt(p, day, hour) : true }));
    return hour === null ? list : [...list.filter((x) => x.free), ...list.filter((x) => !x.free)];
  }, [people, day, hour]);
  const freeCount = rows.filter((x) => x.free).length;

  const link = (start: string, span = "week") => `/admin/compare?ids=${ids.join(",")}&span=${span}&start=${start}`;
  const x = (m: number) => ((Math.min(Math.max(m, START), END) - START) / 60) * HOUR_W;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h1 className="font-serif text-4xl">{monthLabel(day.slice(0, 7))}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={link(nav.prev)} className="rounded-lg border border-line bg-white px-3 py-2">‹</Link>
          <Link href={link(nav.today)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">Today</Link>
          <Link href={link(nav.next)} className="rounded-lg border border-line bg-white px-3 py-2">›</Link>
          <div className="flex rounded-lg bg-beige p-0.5 text-sm">
            <span className="px-3 py-1.5 rounded-md bg-white font-medium">Day</span>
            <Link href={link(days[0], "2w")} className="px-3 py-1.5 rounded-md">2 weeks</Link>
            <Link href={link(`${days[0].slice(0, 7)}-01`, "month")} className="px-3 py-1.5 rounded-md">Month</Link>
          </div>
        </div>
      </div>

      {/* Pick the day */}
      <div className="mb-3 grid grid-cols-7 gap-1.5">
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={`rounded-xl border py-2 text-center ${d === day ? "bg-char text-beige border-char" : "bg-white border-line"} ${d < today && d !== day ? "opacity-50" : ""}`}
          >
            <div className="text-xs uppercase">{DOW[weekday(d)]}</div>
            <div className="text-xl font-semibold">{Number(d.slice(8))}</div>
          </button>
        ))}
      </div>

      {hour !== null && (
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-char px-4 py-3 text-beige">
          <b className="text-lg">{fmtMin(hour)}</b>
          <span>{freeCount} of {people.length} free</span>
          <button onClick={() => setHour(null)} className="ml-auto" aria-label="Clear time">✕</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <div style={{ width: NAME_W + HOURS.length * HOUR_W }}>
          {/* Hour header: tap an hour */}
          <div className="sticky top-0 z-20 flex border-b border-line bg-white">
            <div className="sticky left-0 z-30 shrink-0 bg-white" style={{ width: NAME_W }} />
            {HOURS.map((h) => (
              <button
                key={h}
                onClick={() => setHour(hour === h ? null : h)}
                className={`shrink-0 border-l border-line py-2 text-xs ${hour === h ? "bg-char text-beige font-semibold" : "text-muted hover:bg-sand"}`}
                style={{ width: HOUR_W }}
              >
                {fmtMin(h)}
              </button>
            ))}
          </div>

          {rows.map(({ p, blocks, free }) => (
            <div key={p.id} className={`flex border-b border-line ${hour !== null && !free ? "opacity-40" : ""}`} style={{ height: ROW_H }}>
              <div className="sticky left-0 z-10 flex shrink-0 items-center truncate border-r border-line bg-white px-3 text-sm font-medium" style={{ width: NAME_W }}>
                <Link href={`/admin/cast/${p.id}`} className="truncate hover:underline">{p.name}</Link>
              </div>
              <div className="relative" style={{ width: HOURS.length * HOUR_W }}>
                {/* green = free */}
                <div className="absolute inset-y-1 inset-x-0.5 rounded bg-[#d7ecdf]" />
                {HOURS.map((h) => (
                  <div key={h} className="absolute inset-y-0 border-l border-black/5" style={{ left: x(h) }} />
                ))}
                {/* red = busy, with the reason */}
                {blocks.map((b, i) => (
                  <div
                    key={i}
                    title={`${p.name}: ${b.label}`}
                    className="absolute inset-y-1 overflow-hidden whitespace-nowrap rounded bg-[#c2463e] px-1.5 text-[11px] leading-8 text-white"
                    style={{ left: x(b.s), width: Math.max(4, x(b.e) - x(b.s)) }}
                  >
                    {b.label}
                  </div>
                ))}
                {hour !== null && <div className="pointer-events-none absolute inset-y-0 border-x-2 border-char" style={{ left: x(hour), width: HOUR_W }} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
