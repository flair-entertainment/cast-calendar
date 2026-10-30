"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const clean = (e: string) => e.trim().toLowerCase();

// Step 1: send a login email (link + 8-digit code).
// Invite-only: we only send if the email is on the cast list or is a manager.
// We always show the same message so nobody can find out who is on the roster.
export async function sendLoginEmail(_: unknown, formData: FormData) {
  const email = clean(String(formData.get("email") ?? ""));
  if (!email.includes("@")) return { ok: false, message: "Please enter your email address." };

  const admin = createAdminClient();
  const [{ data: castRow }, { data: adminRow }] = await Promise.all([
    admin.from("cast_members").select("id, active").eq("email", email).maybeSingle(),
    admin.from("app_admins").select("email").eq("email", email).maybeSingle(),
  ]);
  const allowed = Boolean(adminRow) || Boolean(castRow && castRow.active);

  if (allowed) {
    // Make sure they have a login. If it already exists this just returns an error we ignore.
    await admin.auth.admin.createUser({ email, email_confirm: true });
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm` },
    });
    if (error && error.status === 429) {
      return { ok: false, message: "Too many login emails just now. Please wait a minute and try again." };
    }
  }
  return { ok: true, email, message: "If you're on the Flair roster, you'll get an email with an 8-digit code." };
}

// Step 2 (optional): type the 8-digit code instead of clicking the link.
export async function verifyCode(_: unknown, formData: FormData) {
  const email = clean(String(formData.get("email") ?? ""));
  const token = String(formData.get("code") ?? "").replace(/\s/g, "");
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { ok: false, message: "That code didn't work. Check it, or request a new email." };
  redirect("/");
}
