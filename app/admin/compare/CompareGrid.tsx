"use client";

import Link from "next/link";
import { useState } from "react";
import { DOW, monthLabel, shortDate, weekday, type Cell } from "@/lib/availability";

type Person = { id: string; name: string; desc: string; isNew: boolean; cells: Cell[] };
type Props = { days: string[]; people: Person[]; counts: number[]; highlight: boolean; today: string; winLabel: string };

const STYLE: Record<Cell["st"], string> = { confirmed: "st-confirmed", free: "st-free", part: "st-part", maybe: "st-maybe", out: "st-out" };
const MARK: Record<Cell["st"], string> = { confirmed: "✓", free: "", part: "½", maybe: "?", out: "✕" };
const LABEL: Record<Cell["st"], string> = {
  confirmed: "Confirmed free",
  free: "Free (nothing marked)",
  part: "Partly free",
  maybe: "Maybe",
  out: "Unavailable",
};

export function CompareGrid({ days, people, counts, highlight, today, winLabel }: Props) {
  // What's shown in the info bar: one person on one day, or a whole day.
  const [pick, setPick] = useState<{ p: number; d: number } | { d: number } | null>(null);
  const N = people.length;

  // Month bands: consecutive days in the same month share one header cell.
  const bands: { month: string; span: number }[] = [];
  for (const d of days) {
    const m = d.slice(0, 7);
    if (bands.length && bands[bands.length - 1].month === m) bands[bands.length - 1].span++;
    else bands.push({ month: m, span: 1 });
  }
  const isMonday = (d: string) => weekday(d) === 1;
  const isWeekend = (d: string) => weekday(d) % 6 === 0;
  const allFree = (i: number) => counts[i] === N;
  const colClass = (d: string, i: number) =>
    [isMonday(d) || i === 0 ? "border-l-2 border-l-char/40" : "border-l border-line", isWeekend(d) ? "bg-sand" : "", highlight && allFree(i) ? "bg-green-100" : ""].join(" ");

  return (
    <div>
      {/* Info bar: tap a cell or a date to see details here */}
      <div className="mb-3 min-h-14 rounded-xl border border-line bg-white px-4 py-3 text-sm">
        {!pick ? (
          <span className="text-muted">Tap any square to see why someone is or isn&apos;t free. Tap a date to see everyone for that day. Showing: <b className="text-ink">{winLabel}</b>.</span>
        ) : "p" in pick ? (
          (() => {
            const person = people[pick.p];
            const cell = person.cells[pick.d];
            return (
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded ${STYLE[cell.st]}`}>{MARK[cell.st]}</span>
                <b>{person.name}</b> · {shortDate(days[pick.d])} · {cell.why || LABEL[cell.st]}
                <button onClick={() => setPick(null)} className="ml-auto text-muted underline">Close</button>
              </div>
            );
          })()
        ) : (
          (() => {
            const i = pick.d;
            const groups: [string, Cell["st"][]][] = [["Free", ["confirmed", "free"]], ["Partly free", ["part"]], ["Maybe", ["maybe"]], ["Unavailable", ["out"]]];
            return (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <b>{shortDate(days[i])}</b> · {counts[i]} of {N} free ({winLabel})
                  <button onClick={() => setPick(null)} className="ml-auto text-muted underline">Close</button>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  {groups.map(([title, sts]) => {
                    const list = people.filter((p) => sts.includes(p.cells[i].st));
                    if (!list.length) return null;
                    return (
                      <div key={title}>
                        <span className="text-xs uppercase tracking-wide text-muted">{title}: </span>
                        {list.map((p) => p.name + (p.cells[i].why && title !== "Free" ? ` (${p.cells[i].why})` : "")).join(", ")}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()
        )}
      </div>

      <div className="overflow-auto rounded-xl border border-line bg-white max-h-[70vh]">
        <table className="border-collapse text-xs">
          <thead className="sticky top-0 z-20 bg-white">
            {/* Month band */}
            <tr>
              <th className="sticky left-0 z-30 bg-char text-beige p-2 text-left min-w-56" rowSpan={1}>Cast member</th>
              {bands.map((b, i) => (
                <th key={b.month + i} colSpan={b.span} className="bg-char text-beige py-2 px-2 text-left text-sm font-semibold uppercase tracking-[0.15em] border-l-2 border-l-sand">
                  {monthLabel(b.month)}
                </th>
              ))}
            </tr>
            {/* Dates (tap for the whole day) */}
            <tr>
              <th className="sticky left-0 z-30 bg-white p-2 text-left text-muted font-normal border-b border-line">Tap a date for the day</th>
              {days.map((d, i) => (
                <th key={d} className={`p-0 border-b border-line ${colClass(d, i)}`}>
                  <button onClick={() => setPick({ d: i })} className={`w-full px-1 py-1.5 ${d === today ? "underline font-bold" : "font-medium"} ${d < today ? "opacity-50" : ""}`}>
                    <div className="text-[10px] text-muted">{DOW[weekday(d)]}</div>
                    <div className="text-base">{Number(d.slice(8))}</div>
                  </button>
                </th>
              ))}
            </tr>
            {/* Free count */}
            <tr>
              <th className="sticky left-0 z-30 bg-beige p-2 text-left border-b border-line">Free</th>
              {counts.map((n, i) => (
                <th key={i} className={`p-1 border-b border-line ${colClass(days[i], i)} ${n === N ? "st-confirmed" : "bg-beige"}`}>{n}/{N}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((p, pi) => (
              <tr key={p.id}>
                <td className="sticky left-0 z-10 bg-white p-2 border-b border-line">
                  <Link href={`/admin/cast/${p.id}`} className="font-medium text-sm hover:underline">{p.name}</Link>
                  {p.isNew && <span className="ml-1.5 text-[10px] font-semibold rounded bg-char text-beige px-1">NEW</span>}
                  <div className="text-muted">{p.desc}</div>
                </td>
                {p.cells.map((cell, i) => {
                  const active = pick && "p" in pick && pick.p === pi && pick.d === i;
                  return (
                    <td key={i} className={`border-b border-line p-0 ${colClass(days[i], i)}`}>
                      <button
                        onClick={() => setPick({ p: pi, d: i })}
                        title={`${p.name} · ${shortDate(days[i])}: ${LABEL[cell.st]}${cell.why ? ` · ${cell.why}` : ""}`}
                        className={`m-0.5 flex h-10 w-11 items-center justify-center rounded text-base font-semibold ${STYLE[cell.st]} ${active ? "ring-2 ring-char ring-offset-1" : ""} ${days[i] < today ? "opacity-50" : ""}`}
                        aria-label={`${p.name}, ${shortDate(days[i])}: ${LABEL[cell.st]}`}
                      >
                        {MARK[cell.st]}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted mt-3">
        <span><i className="inline-flex w-5 h-5 rounded st-confirmed align-middle mr-1 items-center justify-center not-italic">✓</i>Confirmed free</span>
        <span><i className="inline-block w-5 h-5 rounded st-free align-middle mr-1" />Free (nothing marked)</span>
        <span><i className="inline-flex w-5 h-5 rounded st-part align-middle mr-1 items-center justify-center not-italic">½</i>Partly free (regular week clashes)</span>
        <span><i className="inline-flex w-5 h-5 rounded st-maybe align-middle mr-1 items-center justify-center not-italic">?</i>Maybe</span>
        <span><i className="inline-flex w-5 h-5 rounded st-out align-middle mr-1 items-center justify-center not-italic">✕</i>Unavailable</span>
      </div>
    </div>
  );
}
