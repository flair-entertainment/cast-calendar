"use client";

import { useState, useTransition } from "react";
import { Saved } from "@/components/Saved";
import { LOCATIONS } from "@/lib/config";
import { saveDetails } from "../actions";

type M = { full_name: string; phone: string | null; location: string | null; skills: string[] };

export function DetailsForm({ member }: { member: M }) {
  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const input = "mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-ink";
  return (
    <form
      action={(fd) =>
        start(async () => {
          const r = await saveDetails(fd);
          if (r.ok) { setMsg(""); setSaved(true); setTimeout(() => setSaved(false), 1500); } else setMsg(r.message);
        })
      }
      className="rounded-xl bg-white border border-line p-4 space-y-3"
    >
      <label className="block text-xs text-muted">Full name<input name="full_name" defaultValue={member.full_name} required className={input} /></label>
      <label className="block text-xs text-muted">Phone<input name="phone" type="tel" defaultValue={member.phone ?? ""} className={input} /></label>
      <label className="block text-xs text-muted">Where you're based
        <select name="location" defaultValue={member.location ?? ""} required className={input}>
          <option value="" disabled>Choose…</option>
          {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
        </select>
      </label>
      <label className="block text-xs text-muted">Skills (separate with commas)
        <input name="skills" defaultValue={member.skills.join(", ")} placeholder="e.g. aerial hoop, tap, stilts" className={input} />
      </label>
      <button disabled={pending} className="w-full rounded-lg bg-char text-beige py-2.5 font-semibold disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
      {msg && <p className="text-sm text-red-700">{msg}</p>}
      <Saved show={saved} />
    </form>
  );
}
