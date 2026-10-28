"use client";

import { useActionState } from "react";
import { sendLoginEmail, verifyCode } from "./actions";

type State = { ok: boolean; message: string; email?: string } | null;

export function LoginForm({ error }: { error?: string }) {
  const [sent, send, sending] = useActionState<State, FormData>(sendLoginEmail, null);
  const [checked, check, checking] = useActionState<State, FormData>(verifyCode, null);

  const input = "w-full rounded-lg border border-line bg-white px-3 py-3 text-base";
  const button = "w-full rounded-lg bg-char py-3 font-semibold text-beige disabled:opacity-60";

  return (
    <div className="space-y-5">
      {error === "not-on-roster" && (
        <p className="rounded-lg bg-beige p-3 text-sm">You're logged in, but your email isn't on the cast list yet. Please contact the Flair team.</p>
      )}
      {error === "link-expired" && (
        <p className="rounded-lg bg-beige p-3 text-sm">That login link has expired or was already used. Enter your email to get a new one.</p>
      )}
      {!sent?.ok ? (
        <form action={send} className="space-y-3">
          <label className="block text-sm font-medium">Your email</label>
          <input name="email" type="email" autoComplete="email" required className={input} placeholder="you@example.com" />
          <button disabled={sending} className={button}>{sending ? "Sending…" : "Email me a login link"}</button>
          {sent && !sent.ok && <p className="text-sm text-red-700">{sent.message}</p>}
        </form>
      ) : (
        <div className="space-y-4">
          <p className="rounded-lg bg-white p-3 text-sm">{sent.message} Tap the link in the email, or type the code below.</p>
          <form action={check} className="space-y-3">
            <input type="hidden" name="email" value={sent.email} />
            <label className="block text-sm font-medium">6-digit code</label>
            <input name="code" inputMode="numeric" autoComplete="one-time-code" required className={`${input} tracking-[0.4em] text-center text-xl`} maxLength={8} />
            <button disabled={checking} className={button}>{checking ? "Checking…" : "Log in"}</button>
            {checked && !checked.ok && <p className="text-sm text-red-700">{checked.message}</p>}
          </form>
          <button onClick={() => location.reload()} className="text-sm underline text-muted">Use a different email</button>
        </div>
      )}
    </div>
  );
}
