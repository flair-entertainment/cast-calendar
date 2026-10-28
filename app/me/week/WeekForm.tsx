"use client";

import { useRef, useState, useTransition } from "react";
import { Saved } from "@/components/Saved";
import { DOW, MON_FIRST } from "@/lib/availability";
import { addWeek, removeWeek } from "../actions";

export function WeekForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      ref={ref}
      action={(fd) =>
        start(async () => {
          const r = await addWeek(fd);
          if (r.ok) {
            ref.current?.reset();
            setMsg("");
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          } else setMsg(r.message);
        })
      }
      className="rounded-xl bg-white border border-line p-4 space-y-3"
    >
      <h2 className="font-medium">Add a regular commitment</h2>
      <div className="flex flex-wrap gap-1.5">
        {MON_FIRST.map((d) => (
          <label key={d} className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-sm has-[:checked]:bg-char has-[:checked]:text-beige">
            <input type="checkbox" name="days" value={d} className="sr-only" />
            {DOW[d]}
          </label>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">Not free from<input type="time" name="start" defaultValue="09:00" required className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-ink" /></label>
        <label className="text-xs text-muted">Until<input type="time" name="end" defaultValue="17:00" required className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-ink" /></label>
      </div>
      <input name="note" placeholder="What is it? e.g. Day job" className="w-full rounded-lg border border-line px-3 py-2" />
      <button disabled={pending} className="w-full rounded-lg bg-char text-beige py-2.5 font-semibold disabled:opacity-50">{pending ? "Saving…" : "Add"}</button>
      {msg && <p className="text-sm text-red-700">{msg}</p>}
      <Saved show={saved} />
    </form>
  );
}

export function RemoveButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(() => removeWeek(id))} className="text-sm text-red-700 underline disabled:opacity-50">
      Remove
    </button>
  );
}
