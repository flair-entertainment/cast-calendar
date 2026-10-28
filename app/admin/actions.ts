"use server";

import { revalidatePath } from "next/cache";
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
  await createAdminClient().from("cast_members").update({ roles: picked, location, active }).eq("id", id);
  revalidatePath(`/admin/cast/${id}`);
  revalidatePath("/admin/cast");
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
