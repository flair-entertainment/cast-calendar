import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The link in the login email lands here. It works with both kinds of link:
// - our custom email template (token_hash=...)
// - Supabase's standard email template, which sends people back with ?code=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;
  const url = request.nextUrl.clone();
  url.search = "";

  const supabase = await createClient();
  let ok = false;
  if (token_hash) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  if (ok) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  url.pathname = "/login";
  // "other-browser" covers the common case of opening the email on a different phone or app.
  url.searchParams.set("error", code ? "other-browser" : "link-expired");
  return NextResponse.redirect(url);
}
