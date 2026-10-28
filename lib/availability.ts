// Shared rules for working out whether someone is free on a date.
// Used by the manager pages (Overview, Compare, Profile).
import { TIME_WINDOWS, type WindowKey } from "@/lib/config";

export type AvailabilityRow = {
  cast_member_id: string;
  date: string; // YYYY-MM-DD
  status: "available" | "maybe" | "unavailable";
  start_time: string | null;
  end_time: string | null;
  note: string | null;
};

export type WeekRow = {
  id?: string;
  cast_member_id: string;
  days: number[]; // 0 = Sunday ... 6 = Saturday
  start_time: string; // HH:MM or HH:MM:SS
  end_time: string;
  note: string;
};

// What a manager sees in a cell.
//  confirmed: performer marked the day available
//  free:      nothing marked and no regular-week clash (counts as available)
//  part:      nothing marked, but their regular week takes part of the time needed
//  maybe:     performer marked maybe
//  out:       marked unavailable, or their regular week covers all the time needed
export type Cell = { st: "confirmed" | "free" | "part" | "maybe" | "out"; why: string };

export const isAvailable = (c: Cell) => c.st === "confirmed" || c.st === "free";

// ---------- dates (all as YYYY-MM-DD strings, no time zones involved) ----------
const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (y: number, m: number, d: number) => {
  const t = new Date(Date.UTC(y, m - 1, d));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};
export const parts = (s: string) => s.split("-").map(Number) as [number, number, number];
export const addDays = (s: string, n: number) => {
  const [y, m, d] = parts(s);
  return ymd(y, m, d + n);
};
export const weekday = (s: string) => {
  const [y, m, d] = parts(s);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};
export const daysBetween = (a: string, b: string) => {
  const [y1, m1, d1] = parts(a);
  const [y2, m2, d2] = parts(b);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
};
export const range = (from: string, count: number) => Array.from({ length: count }, (_, i) => addDays(from, i));
export const monthDays = (month: string) => {
  // month: YYYY-MM
  const [y, m] = month.split("-").map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return range(ymd(y, m, 1), n);
};
export const shiftMonth = (month: string, n: number) => {
  const [y, m] = month.split("-").map(Number);
  return ymd(y, m + n, 1).slice(0, 7);
};
// Today in London, as YYYY-MM-DD.
export const todayLondon = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];
export const ukDate = (s: string) => {
  const [y, m, d] = parts(s);
  return `${pad(d)}/${pad(m)}/${y}`;
};
export const shortDate = (s: string) => {
  const [, m, d] = parts(s);
  return `${DOW[weekday(s)]} ${d} ${MONTHS[m - 1]}`;
};
export const monthLabel = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
};
export const daysLabel = (days: number[]) => {
  const k = [...days].sort().join();
  if (k === "1,2,3,4,5") return "Weekdays";
  if (k === "0,6") return "Weekends";
  if (k === "0,1,2,3,4,5,6") return "Every day";
  return MON_FIRST.filter((d) => days.includes(d)).map((d) => DOW[d]).join(", ");
};

// ---------- times ----------
export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};
export const fmtMin = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const hhmm = (t: string) => t.slice(0, 5);

export function getWindow(key: WindowKey, customStart?: string, customEnd?: string) {
  let s: string, e: string;
  if (key === "custom") {
    s = customStart || "18:00";
    e = customEnd || "21:00";
  } else {
    ({ start: s, end: e } = TIME_WINDOWS[key] ?? TIME_WINDOWS.full);
  }
  let a = toMin(s), b = toMin(e);
  if (b < a) [a, b] = [b, a];
  if (b === a) b = a + 60;
  return { s: a, e: b, label: key === "custom" ? `${fmtMin(a)} to ${fmtMin(b)}` : `${TIME_WINDOWS[key].label} (${fmtMin(a)} to ${fmtMin(b)})` };
}

// ---------- the core rule ----------
export function cellFor(
  date: string,
  row: AvailabilityRow | undefined,
  week: WeekRow[],
  win: { s: number; e: number },
): Cell {
  if (row) {
    const note = row.note ? `: ${row.note}` : "";
    const time = row.start_time && row.end_time ? ` (${hhmm(row.start_time)} to ${hhmm(row.end_time)})` : "";
    if (row.status === "unavailable") return { st: "out", why: `Unavailable${time}${note}` };
    if (row.status === "maybe") return { st: "maybe", why: `Maybe${time}${note}` };
    return { st: "confirmed", why: `Confirmed available${time}${note}` };
  }
  let free: [number, number][] = [[win.s, win.e]];
  const clashes = new Set<string>();
  const wd = weekday(date);
  for (const r of week) {
    if (!r.days.includes(wd)) continue;
    const rs = toMin(r.start_time), re = toMin(r.end_time);
    const next: [number, number][] = [];
    let hit = false;
    for (const [a, b] of free) {
      if (re <= a || rs >= b) { next.push([a, b]); continue; }
      hit = true;
      if (rs > a) next.push([a, rs]);
      if (re < b) next.push([re, b]);
    }
    if (hit) clashes.add(r.note || "Regular commitment");
    free = next;
  }
  if (!clashes.size) return { st: "free", why: "" };
  const label = [...clashes].join(", ");
  if (!free.length) return { st: "out", why: `Regular week: ${label}` };
  return { st: "part", why: `Only free ${free.map(([a, b]) => `${fmtMin(a)} to ${fmtMin(b)}`).join(", ")} (${label})` };
}

// Index rows for fast lookup: key = memberId|date
export const indexRows = (rows: AvailabilityRow[]) => {
  const m = new Map<string, AvailabilityRow>();
  for (const r of rows) m.set(`${r.cast_member_id}|${r.date}`, r);
  return m;
};
export const groupWeeks = (rows: WeekRow[]) => {
  const m = new Map<string, WeekRow[]>();
  for (const r of rows) m.set(r.cast_member_id, [...(m.get(r.cast_member_id) ?? []), r]);
  return m;
};

export const isStale = (lastUpdated: string, today: string, staleDays: number) =>
  daysBetween(lastUpdated.slice(0, 10), today) > staleDays;
