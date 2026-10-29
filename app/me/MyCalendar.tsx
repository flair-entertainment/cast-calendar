"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Saved } from "@/components/Saved";
import { addDays, monthDays, monthLabel, shiftMonth, weekday, daysBetween, ukDate } from "@/lib/availability";
import type { Status } from "@/lib/config";
import { setDays } from "./actions";

type Row = { date: string; status: Status; note: string | null };
const NEXT: Record<string, Status | null> = { none: "unavailable", unavailable: "maybe", maybe: "available", available: null };
const STYLE: Record<string, string> = { unavailable: "st-out", maybe: "st-maybe", available: "st-confirmed", none: "st-none" };
const LABEL: Record<string, string> = { unavailable: "Can't do", maybe: "Maybe", available: "Free" };

export function MyCalendar({ memberId, month: startMonth, today, rows }: { memberId: string; month: string; today: string; rows: Row[] }) {
  const [map, setMap] = useState(() => new Map(rows.map((r) => [r.date, r])));
  const [month, setMonth] = useState(startMonth);
  const [loading, setLoading] = useState(false);
  // Months already loaded. Changing month loads straight from the database in the
  // browser (the database's security rules only return this performer's own dates).
  const loaded = useRef(new Set([startMonth]));

  async function loadMonth(m: string) {
    if (loaded.current.has(m)) return;
    loaded.current.add(m);
    const days = monthDays(m);
    const { data, error } = await createClient()
      .from("availability")
      .select("date, status, note")
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
  // Load the months either side in the background so the arrows feel instant.
  useEffect(() => { loadMonth(shiftMonth(month, 1)); loadMonth(shiftMonth(month, -1)); }, [month]); // eslint-disable-line react-hooks/exhaustive-deps
  const [selecting, setSelecting] = useState(false);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [, start] = useTransition();

  const days = monthDays(month);
  const offset = (weekday(days[0]) + 6) % 7; // weeks start Monday

  function flash(ok: boolean) {
    if (!ok) return setError("Couldn't save. Check your connection and try again.");
    setError("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function apply(dates: string[], status: Status | null, n?: string) {
    setMap((old) => {
      const m = new Map(old);
      dates.forEach((d) => (status ? m.set(d, { date: d, status, note: n || null }) : m.delete(d)));
      return m;
    });
    start(async () => flash((await setDays(dates, status, n)).ok));
  }

  function tap(d: string) {
    if (d < today) return;
    if (!selecting) {
      const cur = map.get(d)?.status ?? "none";
      return apply([d], NEXT[cur], map.get(d)?.note ?? undefined);
    }
    if (!anchor) {
      setAnchor(d);
      setSel([d]);
    } else {
      const [a, b] = anchor <= d ? [anchor, d] : [d, anchor];
      setSel(Array.from({ length: daysBetween(a, b) + 1 }, (_, i) => addDays(a, i)).filter((x) => x >= today));
      setAnchor(null);
    }
  }

  function applySelection(status: Status | null) {
    apply(sel, status, note);
    setSel([]);
    setAnchor(null);
    setNote("");
    setSelecting(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => goTo(shiftMonth(month, -1))} className="rounded-lg border border-line bg-white px-4 py-2" aria-label="Previous month">‹</button>
        <h1 className="font-serif text-xl">{monthLabel(month)}{loading && <span className="ml-2 text-sm text-muted">loading…</span>}</h1>
        <button onClick={() => goTo(shiftMonth(month, 1))} className="rounded-lg border border-line bg-white px-4 py-2" aria-label="Next month">›</button>
      </div>

      <p className="text-sm text-muted mb-3">
        {selecting
          ? anchor
            ? "Now tap the last day."
            : "Tap the first day of the dates you want to set."
          : "Only mark the days you can't do. Blank days count as free. Tap a day to change it."}
      </p>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted mb-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => <div key={`b${i}`} />)}
        {days.map((d) => {
          const st = map.get(d)?.status ?? "none";
          const past = d < today;
          const picked = sel.includes(d);
          return (
            <button
              key={d}
              onClick={() => tap(d)}
              disabled={past}
              className={`aspect-square rounded-lg border text-sm flex flex-col items-center justify-center ${STYLE[st]} ${past ? "opacity-35" : ""} ${picked ? "ring-4 ring-char" : "border-line"} ${d === today ? "font-bold underline" : ""}`}
              aria-label={`${ukDate(d)}: ${LABEL[st] ?? "free (not marked)"}`}
            >
              <span>{Number(d.slice(8))}</span>
              {st !== "none" && <span className="text-[10px] leading-none mt-0.5">{LABEL[st]}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted mt-3">
        <span><i className="inline-block w-3 h-3 rounded st-out align-middle mr-1" />Can't do</span>
        <span><i className="inline-block w-3 h-3 rounded st-maybe align-middle mr-1" />Maybe</span>
        <span><i className="inline-block w-3 h-3 rounded st-confirmed align-middle mr-1" />Free (confirmed)</span>
        <span><i className="inline-block w-3 h-3 rounded st-none border border-line align-middle mr-1" />Not marked = free</span>
      </div>

      {!selecting ? (
        <button onClick={() => setSelecting(true)} className="mt-5 w-full rounded-lg border border-char py-3 font-medium">
          Set several days at once (e.g. a holiday)
        </button>
      ) : (
        <div className="mt-5 rounded-xl bg-white border border-line p-4 space-y-3">
          <p className="text-sm">
            {sel.length ? `${sel.length} day${sel.length > 1 ? "s" : ""} selected (${ukDate(sel[0])} to ${ukDate(sel[sel.length - 1])})` : "No days selected yet."}
          </p>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional), e.g. Holiday" className="w-full rounded-lg border border-line px-3 py-2" />
          <div className="grid grid-cols-2 gap-2">
            <button disabled={!sel.length} onClick={() => applySelection("unavailable")} className="rounded-lg st-out py-2.5 font-medium disabled:opacity-40">Can't do</button>
            <button disabled={!sel.length} onClick={() => applySelection("maybe")} className="rounded-lg st-maybe py-2.5 font-medium disabled:opacity-40">Maybe</button>
            <button disabled={!sel.length} onClick={() => applySelection("available")} className="rounded-lg st-confirmed py-2.5 font-medium disabled:opacity-40">Free</button>
            <button disabled={!sel.length} onClick={() => applySelection(null)} className="rounded-lg border border-line py-2.5 font-medium disabled:opacity-40">Clear</button>
          </div>
          <button onClick={() => { setSelecting(false); setSel([]); setAnchor(null); }} className="text-sm underline text-muted">Cancel</button>
        </div>
      )}

      <RangeForm today={today} onApply={(dates, status, n) => apply(dates, status, n)} />

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <Saved show={saved} />
    </div>
  );
}

// For holidays that cross into another month.
function RangeForm({ today, onApply }: { today: string; onApply: (d: string[], s: Status | null, n?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<Status>("unavailable");
  const [note, setNote] = useState("");
  if (!open)
    return <button onClick={() => setOpen(true)} className="mt-3 text-sm underline">Add dates that run into another month</button>;
  const valid = from && to && from >= today && to >= from && daysBetween(from, to) < 366;
  return (
    <div className="mt-4 rounded-xl bg-white border border-line p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">From<input type="date" min={today} value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-ink" /></label>
        <label className="text-xs text-muted">To<input type="date" min={from || today} value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-ink" /></label>
      </div>
      <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="w-full rounded-lg border border-line px-3 py-2">
        <option value="unavailable">Can't do</option>
        <option value="maybe">Maybe</option>
        <option value="available">Free</option>
      </select>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional), e.g. Holiday" className="w-full rounded-lg border border-line px-3 py-2" />
      <button
        disabled={!valid}
        onClick={() => {
          onApply(Array.from({ length: daysBetween(from, to) + 1 }, (_, i) => addDays(from, i)), status, note);
          setOpen(false); setFrom(""); setTo(""); setNote("");
        }}
        className="w-full rounded-lg bg-char text-beige py-2.5 font-semibold disabled:opacity-40"
      >
        Save these dates
      </button>
    </div>
  );
}
