// @ts-nocheck
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
const createClient = () => ({ from: () => ({ select: () => ({ eq: () => ({ gte: () => ({ lte: async () => ({ data: [], error: null }) }) }) }) }) });
import { Saved } from "@/components/Saved";
import { addDays, daysBetween, fmtMin, hhmm, monthDays, monthLabel, shiftMonth, toMin, ukDate, weekday, type WeekRow } from "@/lib/availability";
import type { Status } from "@/lib/config";
import { setBusy, setDays } from "./stub";

// Blank = free. Performers only mark when they're busy (whole day, or certain hours).
type Row = { date: string; status: Status; note: string | null; start_time: string | null; end_time: string | null };

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const longDate = (d: string) => `${DAY_NAMES[weekday(d)]} ${Number(d.slice(8))} ${MONTH_NAMES[Number(d.slice(5, 7)) - 1]}`;

type Props = { memberId: string; month: string; today: string; rows: Row[]; weeks: WeekRow[] };

export function MyCalendar({ memberId, month: startMonth, today, rows, weeks }: Props) {
  const [map, setMap] = useState(() => new Map(rows.map((r) => [r.date, r])));
  const [month, setMonth] = useState(startMonth);
  const [loading, setLoading] = useState(false);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [, start] = useTransition();
  const loaded = useRef(new Set([startMonth]));

  // Changing month loads straight from the database (only their own dates are returned).
  async function loadMonth(m: string) {
    if (loaded.current.has(m)) return;
    loaded.current.add(m);
    const days = monthDays(m);
    const { data, error } = await createClient()
      .from("availability")
      .select("date, status, note, start_time, end_time")
      .eq("cast_member_id", memberId)
      .gte("date", days[0])
      .lte("date", days[days.length - 1]);
    if (error) { loaded.current.delete(m); return; }
    setMap((old) => {
      const next = new Map(old);
      (data ?? []).forEach((r) => { if (!next.has(r.date)) next.set(r.date, r as Row); });
      return next;
    });
  }
  async function goTo(m: string) {
    setSel([]); setAnchor(null);
    setMonth(m);
    try { window.history.replaceState(null, "", `/me?m=${m}`); } catch {}
    if (!loaded.current.has(m)) { setLoading(true); await loadMonth(m); setLoading(false); }
  }
  useEffect(() => { loadMonth(shiftMonth(month, 1)); loadMonth(shiftMonth(month, -1)); }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  const days = monthDays(month);
  const offset = (weekday(days[0]) + 6) % 7; // weeks start Monday

  function flash(ok: boolean) {
    if (!ok) return setError("Couldn't save. Check your connection and try again.");
    setError("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  // Whole days: busy (status "unavailable") or cleared (null).
  function applyDays(dates: string[], busy: boolean, n?: string) {
    setMap((old) => {
      const m = new Map(old);
      dates.forEach((d) => (busy ? m.set(d, { date: d, status: "unavailable", note: n || null, start_time: null, end_time: null }) : m.delete(d)));
      return m;
    });
    start(async () => flash((await setDays(dates, busy ? "unavailable" : null, n)).ok));
  }
  // One day, certain hours.
  function applyHours(d: string, s: string, e: string, n?: string) {
    setMap((old) => new Map(old).set(d, { date: d, status: "unavailable", note: n || null, start_time: s, end_time: e }));
    start(async () => flash((await setBusy(d, s, e, n)).ok));
  }

  function tap(d: string) {
    if (d < today) return;
    if (!selecting) return setOpenDay(d);
    if (!anchor) {
      setAnchor(d);
      setSel([d]);
    } else {
      const [a, b] = anchor <= d ? [anchor, d] : [d, anchor];
      setSel(Array.from({ length: daysBetween(a, b) + 1 }, (_, i) => addDays(a, i)).filter((x) => x >= today));
      setAnchor(null);
    }
  }

  const weekFor = (d: string) => weeks.filter((w) => w.days.includes(weekday(d)));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => goTo(shiftMonth(month, -1))} className="rounded-lg border border-line bg-white px-4 py-2" aria-label="Previous month">‹</button>
        <h1 className="font-serif text-2xl">{monthLabel(month)}{loading && <span className="ml-2 text-sm text-muted">…</span>}</h1>
        <button onClick={() => goTo(shiftMonth(month, 1))} className="rounded-lg border border-line bg-white px-4 py-2" aria-label="Next month">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted mb-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => <div key={`b${i}`} />)}
        {days.map((d) => {
          const r = map.get(d);
          const past = d < today;
          const picked = sel.includes(d);
          const allDay = r && r.status !== "available" && !r.start_time;
          const part = r && r.status !== "available" && r.start_time && r.end_time;
          const regular = weekFor(d).length > 0;
          return (
            <button
              key={d}
              onClick={() => tap(d)}
              disabled={past}
              className={`aspect-square rounded-lg border text-sm flex flex-col items-center justify-center gap-0.5 ${allDay ? (r!.status === "maybe" ? "st-maybe" : "st-out") : "bg-white"} ${past ? "opacity-35" : ""} ${picked ? "ring-4 ring-char" : "border-line"}`}
              aria-label={`${ukDate(d)}: ${allDay ? "busy all day" : part ? `busy ${hhmm(r!.start_time!)} to ${hhmm(r!.end_time!)}` : "free"}`}
            >
              <span className={d === today ? "flex h-7 w-7 items-center justify-center rounded-full bg-char text-beige font-semibold" : ""}>{Number(d.slice(8))}</span>
              {part && <span className="rounded bg-[#c2463e] px-1 text-[9px] leading-tight text-white">{hhmm(r!.start_time!).replace(":00", "")}–{hhmm(r!.end_time!).replace(":00", "")}</span>}
              {!r && regular && <span className="h-1 w-4 rounded-full bg-muted/40" />}
            </button>
          );
        })}
      </div>

      {!selecting ? (
        <button onClick={() => setSelecting(true)} className="mt-5 w-full rounded-lg border border-char py-3 font-medium">
          Holiday or several days
        </button>
      ) : (
        <div className="mt-5 rounded-xl bg-white border border-line p-4 space-y-3">
          <p className="text-sm">
            {sel.length ? `${ukDate(sel[0])} to ${ukDate(sel[sel.length - 1])}` : anchor ? "Tap the last day" : "Tap the first day"}
          </p>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note, e.g. Holiday" className="w-full rounded-lg border border-line px-3 py-2" />
          <div className="grid grid-cols-2 gap-2">
            <button disabled={!sel.length} onClick={() => { applyDays(sel, true, note); setSel([]); setNote(""); setSelecting(false); }} className="rounded-lg st-out py-2.5 font-medium disabled:opacity-40">Busy</button>
            <button disabled={!sel.length} onClick={() => { applyDays(sel, false); setSel([]); setSelecting(false); }} className="rounded-lg border border-line py-2.5 font-medium disabled:opacity-40">Clear</button>
          </div>
          <button onClick={() => { setSelecting(false); setSel([]); setAnchor(null); }} className="text-sm underline text-muted">Cancel</button>
        </div>
      )}

      {openDay && (
        <DayView
          date={openDay}
          row={map.get(openDay)}
          regular={weekFor(openDay)}
          onClose={() => setOpenDay(null)}
          onAllDay={(n) => applyDays([openDay], true, n)}
          onHours={(s, e, n) => applyHours(openDay, s, e, n)}
          onClear={() => applyDays([openDay], false)}
        />
      )}

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <Saved show={saved} />
    </div>
  );
}

// ---------- Google Calendar-style day ----------
const DSTART = 7 * 60; // 07:00
const DEND = 24 * 60; // midnight
const HOUR_PX = 44;
const y = (m: number) => ((Math.min(Math.max(m, DSTART), DEND) - DSTART) / 60) * HOUR_PX;

type DayProps = {
  date: string;
  row: Row | undefined;
  regular: WeekRow[];
  onClose: () => void;
  onAllDay: (note?: string) => void;
  onHours: (start: string, end: string, note?: string) => void;
  onClear: () => void;
};

function DayView({ date, row, regular, onClose, onAllDay, onHours, onClear }: DayProps) {
  const busyRow = row && row.status !== "available" ? row : undefined;
  const [from, setFrom] = useState(busyRow?.start_time ? hhmm(busyRow.start_time) : "");
  const [to, setTo] = useState(busyRow?.end_time ? hhmm(busyRow.end_time) : "");
  const [note, setNote] = useState(busyRow?.note ?? "");
  // Pick one: busy for certain hours (default) or all day. Only "Save" saves.
  const [mode, setMode] = useState<"hours" | "allday">(busyRow && !busyRow.start_time ? "allday" : "hours");
  const scroller = useRef<HTMLDivElement>(null);
  const hours = Array.from({ length: (DEND - DSTART) / 60 }, (_, i) => DSTART + i * 60);
  const validHours = from && to && to > from;

  // Start the timeline around 09:00 (or the busy time).
  useEffect(() => {
    const first = busyRow?.start_time ? toMin(busyRow.start_time) : 9 * 60;
    scroller.current?.scrollTo({ top: Math.max(0, y(first) - 20) });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tap an hour: start a one-hour busy block there (or stretch the current one).
  function tapHour(h: number) {
    setMode("hours");
    const hs = fmtMin(h), he = fmtMin(Math.min(h + 60, DEND - 1));
    if (from && !to) { if (hs > from) setTo(he); else setFrom(hs); return; }
    if (from && to && hs >= to) return setTo(he);
    if (from && to && hs < from) return setFrom(hs);
    setFrom(hs); setTo(he);
  }

  const allDay = mode === "allday";
  const blockS = validHours ? toMin(from) : null;
  const blockE = validHours ? toMin(to) : null;
  const canSave = allDay || validHours;
  function save() {
    if (allDay) onAllDay(note);
    else if (validHours) onHours(from, to, note);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-sand">
      <header className="flex items-center gap-3 bg-char px-4 py-3 text-beige">
        <button onClick={onClose} className="text-2xl leading-none" aria-label="Back">‹</button>
        <h2 className="font-serif text-xl">{longDate(date)}</h2>
      </header>

      <div className="border-b border-line bg-white px-4 py-2">
        <div className="mx-auto grid max-w-xl grid-cols-2 rounded-lg bg-beige p-1 text-sm">
          <button onClick={() => setMode("hours")} className={`rounded-md py-2 ${!allDay ? "bg-white font-semibold shadow-sm" : ""}`}>Busy certain hours</button>
          <button onClick={() => setMode("allday")} className={`rounded-md py-2 ${allDay ? "bg-[#c2463e] font-semibold text-white" : ""}`}>Busy all day</button>
        </div>
      </div>

      <div ref={scroller} className="relative flex-1 overflow-y-auto bg-white">
        <div className="relative mx-auto max-w-xl" style={{ height: hours.length * HOUR_PX }}>
          {hours.map((h) => (
            <button key={h} onClick={() => tapHour(h)} className="absolute inset-x-0 flex border-t border-line text-left" style={{ top: y(h), height: HOUR_PX }}>
              <span className="w-14 shrink-0 -translate-y-2 pr-2 text-right text-[11px] text-muted">{fmtMin(h)}</span>
              <span className="flex-1" />
            </button>
          ))}
          {/* Regular week (grey) */}
          {regular.map((w) => (
            <div key={w.id ?? w.note} className="pointer-events-none absolute left-16 right-2 rounded-md bg-[#e4ddd1] px-2 py-1 text-xs text-ink/80" style={{ top: y(toMin(w.start_time)), height: Math.max(18, y(toMin(w.end_time)) - y(toMin(w.start_time))) }}>
              {w.note || "Regular"} · {hhmm(w.start_time)}–{hhmm(w.end_time)}
            </div>
          ))}
          {/* Busy block (red) */}
          {allDay ? (
            <div className="pointer-events-none absolute left-16 right-2 rounded-md bg-[#c2463e]/85" style={{ top: 0, height: hours.length * HOUR_PX }} />
          ) : blockS !== null && blockE !== null ? (
            <div className="pointer-events-none absolute left-16 right-2 rounded-md bg-[#c2463e] px-2 py-1 text-xs font-medium text-white shadow" style={{ top: y(blockS), height: Math.max(20, y(blockE) - y(blockS)) }}>
              Busy · {from}–{to}{note ? ` · ${note}` : ""}
            </div>
          ) : null}
        </div>
      </div>

      <footer className="border-t border-line bg-white px-4 py-3 space-y-2">
        <div className="mx-auto max-w-xl space-y-2">
          {!allDay && <div className="flex items-center gap-2">
            <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} className="flex-1 rounded-lg border border-line px-2 py-2" aria-label="Busy from" />
            <span className="text-muted">–</span>
            <input type="time" value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 rounded-lg border border-line px-2 py-2" aria-label="Busy until" />
          </div>}
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="w-full rounded-lg border border-line px-3 py-2" />
          <div className="grid grid-cols-2 gap-2">
            <button disabled={!canSave} onClick={save} className="rounded-lg bg-char py-2.5 font-semibold text-beige disabled:opacity-40">Save</button>
            <button disabled={!busyRow} onClick={() => { onClear(); onClose(); }} className="rounded-lg border border-line py-2.5 font-medium disabled:opacity-40">Clear day</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
