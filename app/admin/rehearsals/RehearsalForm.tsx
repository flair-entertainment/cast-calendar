"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { busyFor, deleteRehearsal, saveRehearsal } from "../actions";

type Person = { id: string; name: string };
type Initial = { id?: string; title: string; date: string; start: string; end: string; location: string; notes: string; cast: string[] };
type State = { ok: boolean; message: string } | null;

export function RehearsalForm({ cast, today, initial }: { cast: Person[]; today: string; initial: Initial }) {
  const [state, save, saving] = useActionState<State, FormData>(saveRehearsal, null);
  const [date, setDate] = useState(initial.date);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [called, setCalled] = useState<Set<string>>(new Set(initial.cast));
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<Record<string, string>>({});
  const [sureDelete, setSureDelete] = useState(false);

  // Warn about anyone who isn't free at this time (their own busy times, regular week, other rehearsals).
  useEffect(() => {
    if (!date || !start || !end || end <= start) return setBusy({});
    let live = true;
    const t = setTimeout(() => busyFor(date, start, end, initial.id).then((b) => live && setBusy(b)).catch(() => {}), 300);
    return () => { live = false; clearTimeout(t); };
  }, [date, start, end, initial.id]);

  const toggle = (id: string) => setCalled((old) => { const s = new Set(old); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return cast.filter((p) => !n || p.name.toLowerCase().includes(n));
  }, [cast, q]);
  const calledBusy = [...called].filter((id) => busy[id]).length;

  const input = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
      <form action={save} className="space-y-3">
        {initial.id && <input type="hidden" name="id" value={initial.id} />}
        {[...called].map((id) => <input key={id} type="hidden" name="cast" value={id} />)}
        <label className="block text-sm">Title<input name="title" required defaultValue={initial.title} placeholder="e.g. Elf show rehearsal" className={input} /></label>
        <label className="block text-sm">Date<input name="date" type="date" required min={initial.id ? undefined : today} value={date} onChange={(e) => setDate(e.target.value)} className={input} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">Start<input name="start" type="time" required value={start} onChange={(e) => setStart(e.target.value)} className={input} /></label>
          <label className="block text-sm">End<input name="end" type="time" required value={end} onChange={(e) => setEnd(e.target.value)} className={input} /></label>
        </div>
        <label className="block text-sm">Where (optional)<input name="location" defaultValue={initial.location} placeholder="e.g. Studio 2, St Helier" className={input} /></label>
        <label className="block text-sm">Notes for the cast (optional)<textarea name="notes" rows={3} defaultValue={initial.notes} placeholder="e.g. Bring character shoes" className={input} /></label>

        <div className="rounded-lg bg-white border border-line p-3 text-sm">
          <b>{called.size}</b> called{calledBusy > 0 && <span className="ml-2 text-red-700">· {calledBusy} not free at this time</span>}
        </div>
        <button disabled={saving} className="w-full rounded-lg bg-char py-3 font-semibold text-beige disabled:opacity-60">{saving ? "Saving…" : "Save rehearsal"}</button>
        {state && !state.ok && <p className="text-sm text-red-700">{state.message}</p>}
        <div className="flex items-center justify-between text-sm">
          <Link href="/admin/rehearsals" className="underline text-muted">Cancel</Link>
          {initial.id && (
            sureDelete ? (
              <button formAction={deleteRehearsal} className="rounded-lg bg-[#c2463e] px-3 py-1.5 font-semibold text-white">Yes, delete it</button>
            ) : (
              <button type="button" onClick={() => setSureDelete(true)} className="underline text-red-700">Delete rehearsal</button>
            )
          )}
        </div>
      </form>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cast" className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm" />
          {called.size > 0 && <button type="button" onClick={() => setCalled(new Set())} className="text-sm underline text-muted">Clear</button>}
        </div>
        <div className="max-h-[60vh] divide-y divide-line overflow-y-auto rounded-xl border border-line bg-white">
          {list.map((p) => (
            <label key={p.id} className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm ${called.has(p.id) ? "bg-sand" : ""}`}>
              <input type="checkbox" checked={called.has(p.id)} onChange={() => toggle(p.id)} />
              <span className="flex-1 font-medium">{p.name}</span>
              {busy[p.id] && <span className="max-w-[55%] truncate rounded bg-[#c2463e]/10 px-1.5 text-xs text-[#a3352e]" title={busy[p.id]}>{busy[p.id]}</span>}
            </label>
          ))}
          {!list.length && <p className="p-3 text-sm text-muted">No one matches.</p>}
        </div>
      </div>
    </div>
  );
}
