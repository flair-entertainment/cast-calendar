"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { waitSeconds } from "@/lib/waitSeconds";
import { LOCATIONS, ROLES } from "@/lib/config";

const roles = ROLES as readonly string[];
const locations = LOCATIONS as readonly string[];
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");

type R = { ok: boolean; message: string; email?: string; wait?: number };

// A performer signs themselves up. They need the Flair join code (shared in the
// performer group chat). They get access straight away, and show as "New" to
// managers until a manager confirms them.
export async function joinFlair(_: unknown, formData: FormData): Promise<R> {
  const expected = process.env.SIGNUP_CODE;
  if (!expected) return { ok: false, message: "Sign-up isn't open yet. Please contact the Flair team." };
  if (norm(String(formData.get("code") ?? "")) !== norm(expected)) {
    return { ok: false, message: "That join code isn't right. Check the Flair performer group chat for the code." };
  }

  const full_name = String(formData.get("full_name") ?? "").trim().slice(0, 100);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40) || null;
  const picked = formData.getAll("roles").map(String).filter((r) => roles.includes(r));
  const location = String(formData.get("location") ?? "");
  const skills = String(formData.get("skills") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 20);

  if (!full_name) return { ok: false, message: "Please enter your full name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "Please enter a valid email address." };
  if (!picked.length) return { ok: false, message: "Please tick at least one role." };
  if (!locations.includes(location)) return { ok: false, message: "Please choose where you're based." };

  const admin = createAdminClient();
  const { data: existing } = await admin.from("cast_members").select("id, active").eq("email", email).maybeSingle();

  if (!existing) {
    const { error } = await admin.from("cast_members").insert({
      full_name, email, phone, roles: picked, location, skills, confirmed: false, self_signup: true,
    });
    if (error) return { ok: false, message: "Something went wrong saving your details. Please try again." };
  } else if (!existing.active) {
    return { ok: false, message: "Your profile is switched off. Please contact the Flair team." };
  }

  // Make sure they have a login (ignored if it already exists), then email them a link and code.
  await admin.auth.admin.createUser({ email, email_confirm: true });
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm` },
  });
  if (error) {
    console.error("join: login email failed", error.status, error.message);
    if (error.status === 429) return { ok: false, email, wait: waitSeconds(error.message), message: "" };
    return { ok: false, message: "Your details are saved, but the login email didn't send. Please try again from the login page in a minute." };
  }
  return {
    ok: true,
    email,
    message: existing
      ? "You're already on the Flair list, so we've emailed you a login code."
      : "You're signed up! We've emailed you an 8-digit login code.",
  };
}
