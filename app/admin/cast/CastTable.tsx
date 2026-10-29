"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { isStale, ukDate } from "@/lib/availability";
import { LOCATIONS, ROLES, STALE_DAYS, cap, locationLabel, rolesLabel } from "@/lib/config";
import type { CastMember } from "@/lib/data";

const KEY = "cc-selected";

export function CastTable({ cast, today, startNewOnly = false }: { cast: CastMember[]; today: string; startNewOnly?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [loc, setLoc] = useState("");
  const [skill, setSkill] = useState("");
  const [active, setActive] = useState("active");
  const [staleOnly, setStaleOnly] = useState(false);
  const [newOnly, setNewOnly] = useState(startNewOnly);
  const [showFilters, setShowFilters] = useState(startNewOnly);
  const [sel, setSel] = useState<Set<string>>(new Set());

  // Remember the selection while moving between pages (this browser only).
  useEffect(() => {
    try { setSel(new Set(JSON.parse(sessionStorage.getItem(KEY) || "[]"))); } catch {}
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify([...sel])); } catch {}
  }, [sel]);

  const filtered = useMemo(() => {
    const s = skill.trim().toLowerCase();
    const n = q.trim().toLowerCase();
    return cast.filter(
      (c) =>
        (!n || c.full_name.toLowerCase().includes(n) || c.email.includes(n)) &&
        (!role || c.roles.includes(role)) &&
        (!loc || (loc === "none" ? !c.location : c.location === loc)) &&
        (!s || c.skills.some((k) => k.includes(s))) &&
        (active === "all" || (active === "active" ? c.active : !c.active)) &&
        (!staleOnly || isStale(c.last_updated, today, STALE_DAYS)) &&
        (!newOnly || !c.confirmed),
    );
  }, [cast, q, role, loc, skill, active, staleOnly, newOnly, today]);

  const toggle = (id: string) => setSel((old) => { const s = new Set(old); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => sel.has(c.id));
  const ctl = "rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm";

  const newCount = cast.filter((c) => !c.confirmed).length;
  const filtersOn = Boolean(role || loc || skill || active !== "active" || staleOnly || newOnly);

  return (
    <div className="pb-24">
      {newCount > 0 && !newOnly && (
        <button onClick={() => { setNewOnly(true); setShowFilters(true); }} className="mb-3 w-full rounded-lg bg-char text-beige px-4 py-3 text-left text-sm">
          <b>{newCount} new sign-up{newCount === 1 ? "" : "s"} to confirm.</b> Click to see them, then open each profile and tick Confirmed. →
        </button>
      )}

      <p className="text-sm text-muted mb-3">Tick the people you want to compare, then press <b className="text-ink">Compare</b>.</p>

      <div className="flex flex-wrap gap-2 items-center mb-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className={`${ctl} w-64`} />
        <button onClick={() => setShowFilters((v) => !v)} className={`${ctl} ${filtersOn ? "bg-char text-beige border-char" : ""}`}>
          {showFilters ? "Hide filters" : "Filters"}{filtersOn ? " (on)" : ""}
        </button>
        <span className="text-sm text-muted">{filtered.length} shown</span>
        <button
          onClick={() => setSel((old) => { const s = new Set(old); filtered.forEach((c) => (allFilteredSelected ? s.delete(c.id) : s.add(c.id))); return s; })}
          className="text-sm underline"
        >
          {allFilteredSelected ? "Unselect all shown" : "Select all shown"}
        </button>
        {sel.size > 0 && <button onClick={() => setSel(new Set())} className="text-sm underline text-muted">Clear selection</button>}
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 items-center mb-3 rounded-lg bg-beige/60 p-2">
          <select value={role} onChange={(e) => setRole(e.target.value)} className={ctl}>
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{cap(r)}</option>)}
          </select>
          <select value={loc} onChange={(e) => setLoc(e.target.value)} className={ctl}>
            <option value="">All locations</option>
            {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            <option value="none">Not set</option>
          </select>
          <input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Skill" className={`${ctl} w-32`} />
          <select value={active} onChange={(e) => setActive(e.target.value)} className={ctl}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">Active and inactive</option>
          </select>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={staleOnly} onChange={(e) => setStaleOnly(e.target.checked)} />Not updated in {STALE_DAYS}+ days</label>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={newOnly} onChange={(e) => setNewOnly(e.target.checked)} />New sign-ups ({newCount})</label>
          {filtersOn && (
            <button onClick={() => { setRole(""); setLoc(""); setSkill(""); setActive("active"); setStaleOnly(false); setNewOnly(false); }} className="text-sm underline text-muted">Reset filters</button>
          )}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-sand/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <span className="text-sm"><b>{sel.size}</b> selected</span>
          <button
            disabled={!sel.size}
            onClick={() => router.push(`/admin/compare?ids=${[...sel].join(",")}`)}
            className="ml-auto rounded-lg bg-char text-beige px-6 py-2.5 font-semibold disabled:opacity-40"
          >
            Compare {sel.size ? `${sel.size} ` : ""}→
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-beige text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="p-2 w-8"></th><th className="p-2">Name</th><th className="p-2">Role</th><th className="p-2">Location</th><th className="p-2">Skills</th><th className="p-2">Last updated</th><th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((c) => {
              const stale = isStale(c.last_updated, today, STALE_DAYS);
              return (
                <tr key={c.id} onClick={() => toggle(c.id)} className={`cursor-pointer hover:bg-sand/60 ${sel.has(c.id) ? "bg-sand" : ""}`}>
                  <td className="p-2"><input type="checkbox" checked={sel.has(c.id)} onChange={() => toggle(c.id)} onClick={(e) => e.stopPropagation()} aria-label={`Select ${c.full_name}`} /></td>
                  <td className="p-2"><Link href={`/admin/cast/${c.id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:underline">{c.full_name}</Link>{c.is_test && <span className="ml-2 text-[10px] rounded bg-beige px-1">TEST</span>}{!c.confirmed && <span className="ml-2 text-[10px] font-semibold rounded bg-char text-beige px-1.5">NEW</span>}</td>
                  <td className="p-2">{rolesLabel(c.roles)}</td>
                  <td className="p-2">{locationLabel(c.location)}</td>
                  <td className="p-2 text-muted">{c.skills.join(", ")}</td>
                  <td className="p-2">{ukDate(c.last_updated.slice(0, 10))}{stale && <span className="ml-2 rounded bg-amber-100 text-amber-800 px-1.5 text-xs">Out of date</span>}</td>
                  <td className="p-2">{c.active ? "Active" : <span className="text-muted">Inactive</span>}{!c.user_id && <span className="ml-2 text-xs text-muted">(not logged in yet)</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
