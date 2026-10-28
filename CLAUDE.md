# Rules for working on Cast Calendar

The owner is not a developer. Explain each step in plain English, say exactly what to click in a browser, and stop at the end of each stage so they can check it.

## What this is
Flair's performer availability app. ~80-100 performers mark unavailability and their regular week; managers filter, select and compare people side by side. See README.md.

## Tech
- Next.js 15 (App Router), TypeScript, Tailwind CSS 4, Supabase with `@supabase/ssr`.
- UK settings: dates DD/MM/YYYY, weeks start Monday, Europe/London time. Dates are handled as `YYYY-MM-DD` strings (see `lib/availability.ts`) to avoid time-zone bugs.
- Cast pages are phone-first; manager pages are laptop-first.
- Brand: very dark grey, white, very pale beige, black (see `app/globals.css`). Status colours (green/amber/red) stay distinct on purpose.
- Keep it simple. Don't add libraries we don't need.
- Lists that may change (roles, locations, stale days, time windows) live only in `lib/config.ts`.

## Security (very important: real people's personal details)
- Row Level Security on every table. Cast see and change only their own data; managers (in `app_admins`) see everything. Never weaken a policy to make a feature work.
- Check manager access on the server (`requireAdmin()`), never only in the browser.
- The service role key is only used via `lib/supabase/admin.ts` (marked `server-only`), and only after `requireAdmin()` or for the login roster check.
- Never put keys in code or git. Use `.env.local` (git-ignored) and tell the owner which values to add in Vercel's Environment Variables.
- Never ask the owner to paste passwords or keys into the chat. When a tool needs a login, run the command that opens the browser.
- Invite-only login (email link or 6-digit code). No public sign-up.
- Keep search engines blocked.
- Database changes go in new migration files in `supabase/migrations/`, never by editing an old one that has already been run.

## How to work
- `main` is the live site. Make each change on a new branch, show it running locally, push it, give the Vercel preview link, and only merge into `main` when the owner says "go live".
- Git name and email for commits must be the shared Flair GitHub account (Vercel's free plan blocks deploys from other authors).
- Ask before doing anything that costs money, deletes anything, or makes anything public.
- After any change: `npm run typecheck` and `npm run build` must pass.
- Keep README.md up to date in plain English.
