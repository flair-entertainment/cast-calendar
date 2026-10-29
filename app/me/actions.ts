"use server";

import { revalidatePath } from "next/cache";
import { requireCast } from "@/lib/auth";
import { STATUSES, LOCATIONS, type Status } from "@/lib/config";

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = (s: string) => /^\d{2}:\d{2}$/.test(s);

// Set (or clear, when status is null) one or more days for the logged-in performer.
// Uses their own login, so the database only lets them change their own rows.
export async function setDays(dates: string[], status: Status | null, note?: string) {
  const { supabase, member } = await requireCast();
  const days = [...new Set(dates)].filter(isDate).slice(0, 400);
  if (!days.length) return { ok: false };

  if (status === null) {
    const { error } = await supabase.from("availability").delete().eq("cast_member_id", member.id).in("date", days);
    if (error) return { ok: false };
  } else {
    if (!STATUSES.includes(status)) return { ok: false };
    const rows = days.map((date) => ({
      cast_member_id: member.id,
      date,
      status,
      note: note?.trim().slice(0, 200) || null,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("availability").upsert(rows, { onConflict: "cast_member_id,date" });
    if (error) return { ok: false };
  }
  // No page refresh needed: the calendar already shows the change, which keeps taps fast.
  return { ok: true };
}

export async function addWeek(formData: FormData) {
  const { supabase, member } = await requireCast();
  const days = formData.getAll("days").map(Number).filter((d) => d >= 0 && d <= 6);
  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 100);
  if (!days.length || !isTime(start) || !isTime(end) || end <= start) return { ok: false, message: "Pick at least one day and an end time after the start time." };
  const { error } = await supabase.from("regular_week").insert({ cast_member_id: member.id, days, start_time: start, end_time: end, note });
  if (error) return { ok: false, message: "Couldn't save that. Please try again." };
  revalidatePath("/me/week");
  return { ok: true, message: "Saved" };
}

export async function removeWeek(id: string) {
  const { supabase, member } = await requireCast();
  await supabase.from("regular_week").delete().eq("id", id).eq("cast_member_id", member.id);
  revalidatePath("/me/week");
}

export async function saveDetails(formData: FormData) {
  const { supabase, member } = await requireCast();
  const full_name = String(formData.get("full_name") ?? "").trim().slice(0, 100);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40) || null;
  const location = String(formData.get("location") ?? "");
  const skills = String(formData.get("skills") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
  if (!full_name) return { ok: false, message: "Please enter your name." };
  if (!(LOCATIONS as readonly string[]).includes(location)) return { ok: false, message: "Please pick where you're based." };
  const { error } = await supabase.from("cast_members").update({ full_name, phone, location, skills }).eq("id", member.id);
  if (error) return { ok: false, message: "Couldn't save. Please try again." };
  revalidatePath("/me/details");
  return { ok: true, message: "Saved" };
}
