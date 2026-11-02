"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cellFor, rehearsalBlocks, toMin, type AvailabilityRow, type WeekRow } from "@/lib/availability";
import { getRehearsals } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { LOCATIONS, ROLES } from "@/lib/config";

const roles = ROLES as readonly string[];
const locations = LOCATIONS as readonly string[];

// Manager edits roles, location or active on someone's profile.
export async function updateCastAdmin(formData: FormData) {
  await requireAdmin(); // checked on the server before using the secret key
  const id = String(formData.get("id") ?? "");
  const picked = formData.getAll("roles").map(String).filter((r) => roles.includes(r));
  const loc = String(formData.get("location") ?? "");
  const location = locations.includes(loc) ? loc : null;
  const active = formData.get("active") === "on";
  const confirmed = formData.get("confirmed") === "on";
  await createAdminClient().from("cast_members").update({ roles: picked, location, active, confirmed }).eq("id", id);
  revalidatePath(`/admin/cast/${id}`);
  revalidatePath("/admin/cast");
}

// Manager confirms several new sign-ups at once from the Cast list.
export async function confirmCast(ids: string[]) {
  await requireAdmin(); // checked on the server before using the secret key
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const list = [...new Set(ids)].filter((id) => uuid.test(id)).slice(0, 500);
  if (!list.length) return { ok: false };
  const { error } = await createAdminClient().from("cast_members").update({ confirmed: true }).in("id", list);
  revalidatePath("/admin/cast");
  return { ok: !error };
}

// ---------- rehearsals ----------
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

// Add or edit a rehearsal and who's called. Managers only (checked on the server).
export async function saveRehearsal(_: unknown, formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start") ?? "").slice(0, 5);
  const end = String(formData.get("end") ?? "").slice(0, 5);
  const location = String(formData.get("location") ?? "").trim().slice(0, 200) || null;
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 1000) || null;
  const cast = [...new Set(formData.getAll("cast").map(String))].filter((x) => UUID.test(x));

  if (!title) return { ok: false, message: "Give it a title, e.g. Elf rehearsal." };
  if (!DATE.test(date)) return { ok: false, message: "Pick a date." };
  if (!TIME.test(start) || !TIME.test(end) || end <= start) return { ok: false, message: "Check the times: the end must be after the start." };
  if (!cast.length) return { ok: false, message: "Tick at least one person who's called." };

  const admin = createAdminClient();
  const fields = { title, date, start_time: start, end_time: end, location, notes, updated_at: new Date().toISOString() };
  let rid = id;
  if (id) {
    if (!UUID.test(id)) return { ok: false, message: "Something went wrong. Please try again." };
    const { error } = await admin.from("rehearsals").update(fields).eq("id", id);
    if (error) return { ok: false, message: "Couldn't save. Please try again." };
    await admin.from("rehearsal_cast").delete().eq("rehearsal_id", id);
  } else {
    const { data, error } = await admin.from("rehearsals").insert(fields).select("id").single();
    if (error || !data) return { ok: false, message: "Couldn't save. Please try again." };
    rid = data.id;
  }
  const { error } = await admin.from("rehearsal_cast").insert(cast.map((c) => ({ rehearsal_id: rid, cast_member_id: c })));
  if (error) return { ok: false, message: "Saved the rehearsal, but not everyone called. Please open it and save again." };
  revalidatePath("/admin/rehearsals");
  redirect("/admin/rehearsals");
}

export async function deleteRehearsal(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (UUID.test(id)) await createAdminClient().from("rehearsals").delete().eq("id", id);
  revalidatePath("/admin/rehearsals");
  redirect("/admin/rehearsals");
}

// Who isn't free for a rehearsal time: { castId: reason }. Used to warn while picking people.
export async function busyFor(date: string, start: string, end: string, ignoreId?: string) {
  const { supabase } = await requireAdmin();
  if (!DATE.test(date) || !TIME.test(start.slice(0, 5)) || !TIME.test(end.slice(0, 5)) || end <= start) return {};
  const [{ data: rows }, { data: weeks }, rehearsals] = await Promise.all([
    supabase.from("availability").select("cast_member_id, date, status, start_time, end_time, note").eq("date", date),
    supabase.from("regular_week").select("cast_member_id, days, start_time, end_time, note"),
    getRehearsals(supabase, date, date),
  ]);
  const others = rehearsals.filter((r) => r.id !== ignoreId);
  const ids = new Set([...(rows ?? []).map((r) => r.cast_member_id), ...(weeks ?? []).map((w) => w.cast_member_id), ...others.flatMap((r) => r.cast)]);
  const win = { s: toMin(start), e: toMin(end) };
  const out: Record<string, string> = {};
  for (const id of ids) {
    const row = (rows ?? []).find((r) => r.cast_member_id === id) as AvailabilityRow | undefined;
    const wk = ((weeks ?? []) as WeekRow[]).filter((w) => w.cast_member_id === id);
    const c = cellFor(date, row, wk, win, rehearsalBlocks(others, date, id));
    if (c.st !== "free" && c.st !== "confirmed") out[id] = c.why;
  }
  return out;
}

// ---------- CSV import ----------
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows.map((r) => r.map((c) => c.trim()));
}

type ImportResult = { ok: boolean; message: string; added?: number; updated?: number; problems?: string[] };

// Add or update cast from a spreadsheet (CSV). Each person gets a login straight away,
// so they can log in with their email immediately, with no approval step.
export async function importCast(_: unknown, formData: FormData): Promise<ImportResult> {
  await requireAdmin();
  const rows = parseCsv(String(formData.get("csv") ?? ""));
  if (rows.length < 2) return { ok: false, message: "Paste a header row and at least one person." };

  const header = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const col = (name: string) => header.indexOf(name);
  if (col("full_name") < 0 || col("email") < 0) return { ok: false, message: "The first row must include full_name and email." };

  const problems: string[] = [];
  const people = rows.slice(1).flatMap((r, i) => {
    const line = i + 2;
    const get = (n: string) => (col(n) >= 0 ? r[col(n)] ?? "" : "");
    const email = get("email").toLowerCase();
    const full_name = get("full_name");
    // Roles: one or more, separated by semicolons (e.g. "dancer;actor"). "music" counts as musician.
    const personRoles = [...new Set((get("roles") || get("role")).split(/[;|]/).map((r) => r.trim().toLowerCase()).filter(Boolean).map((r) => (r === "music" ? "musician" : r)))];
    const location = get("location");
    const locMatch = location ? locations.find((l) => l.toLowerCase() === location.toLowerCase()) : null;
    if (!full_name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { problems.push(`Row ${line} (${full_name || "no name"}): missing or invalid email, so they can't log in`); return []; }
    const badRole = personRoles.find((r) => !roles.includes(r));
    if (badRole) { problems.push(`Row ${line}: role "${badRole}" isn't one of ${roles.join(", ")}`); return []; }
    if (location && !locMatch) { problems.push(`Row ${line}: location "${location}" isn't one of ${locations.join(", ")}`); return []; }
    const skills = get("skills").split(/[;|]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    return [{ email, full_name, roles: personRoles, location: locMatch ?? null, phone: get("phone") || null, skills }];
  });
  if (!people.length) return { ok: false, message: "Nobody could be imported.", problems };

  const admin = createAdminClient();
  const { data: existing } = await admin.from("cast_members").select("id, email").in("email", people.map((p) => p.email));
  const known = new Map((existing ?? []).map((e) => [e.email, e.id]));
  let added = 0, updated = 0;

  for (const p of people) {
    // Create their login first (ignored if it already exists); the database links it automatically.
    await admin.auth.admin.createUser({ email: p.email, email_confirm: true });
    if (known.has(p.email)) {
      const { error } = await admin.from("cast_members").update({ full_name: p.full_name, roles: p.roles, location: p.location, phone: p.phone, skills: p.skills, active: true }).eq("id", known.get(p.email)!);
      if (error) problems.push(`${p.email}: ${error.message}`); else updated++;
    } else {
      const { error } = await admin.from("cast_members").insert(p);
      if (error) problems.push(`${p.email}: ${error.message}`); else added++;
    }
  }
  revalidatePath("/admin/cast");
  return { ok: true, message: `Done: ${added} added, ${updated} updated.`, added, updated, problems };
}
