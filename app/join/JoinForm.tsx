"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LOCATIONS, ROLES, cap } from "@/lib/config";
import { sendLoginEmail, verifyCode } from "../login/actions";
import { joinFlair } from "./actions";
import { useCountdown } from "@/lib/useCountdown";

type State = { ok: boolean; message: string; email?: string; wait?: number } | null;

export function JoinForm() {
  const [joined, join, joining] = useActionState<State, FormData>(joinFlair, null);
  const [checked, check, checking] = useActionState<State, FormData>(verifyCode, null);
  const [resent, resend, resending] = useActionState<State, FormData>(sendLoginEmail, null);
  const left = useCountdown(resent?.wait ?? joined?.wait, resent ?? joined);
  const input = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-3 text-base text-ink";
  const button = "w-full rounded-lg bg-char py-3 font-semibold text-beige disabled:opacity-60";

  // Signed up, but the email was blocked for a moment: count down, then send the code.
  if (joined?.wait && !resent?.ok) {
    return (
      <form action={resend} className="space-y-3">
        <p className="rounded-lg bg-white p-3 text-sm">Your details are saved.{left > 0 ? ` Please wait ${left}s, then press Send my code.` : ""}</p>
        <input type="hidden" name="email" value={joined.email} />
        <button disabled={resending || left > 0} className={button}>{resending ? "Sending…" : left > 0 ? `Please wait ${left}s` : "Send my code"}</button>
        {resent && !resent.ok && !resent.wait && <p className="text-sm text-red-700">{resent.message}</p>}
      </form>
    );
  }

  const done = joined?.ok ? joined : resent?.ok ? { ...resent, message: "We've emailed you an 8-digit login code." } : null;
  if (done) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-white p-3 text-sm">{done.message} Type it below.</p>
        <form action={check} className="space-y-3">
          <input type="hidden" name="email" value={done.email} />
          <label className="block text-sm font-medium">8-digit code</label>
          <input name="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={10} className={`${input} tracking-[0.4em] text-center text-xl`} />
          <button disabled={checking} className={button}>{checking ? "Checking…" : "Log in"}</button>
          {checked && !checked.ok && <p className="text-sm text-red-700">{checked.message}</p>}
        </form>
      </div>
    );
  }

  return (
    <form action={join} className="space-y-3">
      <label className="block text-xs text-muted">Flair join code (from the performer group chat)
        <input name="code" required autoComplete="off" className={input} />
      </label>
      <label className="block text-xs text-muted">Full name<input name="full_name" required autoComplete="name" className={input} /></label>
      <label className="block text-xs text-muted">Email<input name="email" type="email" required autoComplete="email" className={input} /></label>
      <label className="block text-xs text-muted">Phone<input name="phone" type="tel" autoComplete="tel" className={input} /></label>
      <fieldset className="text-xs text-muted">What do you do? (tick all that apply)
        <div className="mt-1 flex flex-wrap gap-1.5">
          {ROLES.map((r) => (
            <label key={r} className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink has-[:checked]:bg-char has-[:checked]:text-beige">
              <input type="checkbox" name="roles" value={r} className="sr-only" />{cap(r)}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-xs text-muted">Where you're based
        <select name="location" required defaultValue="" className={input}>
          <option value="" disabled>Choose…</option>
          {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
        </select>
      </label>
      <label className="block text-xs text-muted">Skills (optional, separate with commas)
        <input name="skills" placeholder="e.g. aerial hoop, ballet, fire" className={input} />
      </label>
      <button disabled={joining} className={button}>{joining ? "Signing you up…" : "Sign up"}</button>
      {joined && !joined.ok && <p className="text-sm text-red-700">{joined.message}</p>}
      <p className="text-center text-sm text-muted">Already signed up? <Link href="/login" className="underline">Log in</Link></p>
    </form>
  );
}
