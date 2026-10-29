# Cast Calendar

Flair's performer availability system.

- **Performers** log in on their phone and mark the days they can't do, plus their regular week (day job, classes). Days they leave blank count as available.
- **Managers** see everyone on one calendar, filter by role, location and skills, pick any group of people and compare their availability side by side, including for a particular time of day (e.g. evening rehearsals).
- **Privacy:** performers can only ever see and change their own details. This is enforced inside the database, not just hidden on the page.

## Pages

| Who | Page | What it does |
|---|---|---|
| Performers | My availability | Month calendar. Tap a day to cycle: can't do, maybe, free, blank. "Set several days at once" for holidays. |
| Performers | My regular week | Repeating commitments, e.g. day job Mon-Fri 09:00-17:00. |
| Performers | My details | Name, phone, location, skills. |
| Managers | Cast list | Where managers start. Tick the people you want (click anywhere on their row), then press Compare. Search by name; role, location, skill, active, out-of-date and new sign-up filters are under "Filters". |
| Managers | Compare | Opens straight away: bold month header, one row per person, one column per day (2 weeks or a month), count of who's free on top. Toggle at the top: Any time, Daytime, Evenings or Custom hours. Tap a square for the reason, or a date for everyone that day. |
| Managers | Cast profile | One person's details, regular week, upcoming dates and when they last updated. Managers can change roles, location and active here. |
| Managers | Add cast | Upload a spreadsheet (CSV) to add or update cast in one go. They can log in straight away. |

## Accounts it uses

| Service | What for | Cost |
|---|---|---|
| GitHub | Stores the code (private repository `cast-calendar`) | Free |
| Supabase | Database and logins (project `cast-calendar`, London) | Free while testing. Upgrade to Pro (~$25/month) before real performers' details go in, for daily backups and so it never pauses. |
| Vercel | Hosts the website, updates automatically from GitHub | Hobby (free) is for non-commercial use only, so use Pro (~$20/month) for real use. |
| Resend | Sends the login emails | Free up to 100 emails a day |

## First-time setup (in order)

### 1. Create the database
1. In Supabase, open your project, then **SQL Editor** in the left menu, then **New query**.
2. Open `supabase/migrations/20261028000000_init.sql` from this repository, copy all of it, paste it in, click **Run**. You should see "Success". Then do the same, in date order, with every other file in `supabase/migrations/` (currently `20261028120000_multiple_roles.sql`, then `20261028150000_self_signup.sql`).
3. Optional, for testing: do the same with `supabase/seed_test_data.sql`. This adds 300 FAKE cast members (names start with "TEST").
4. Add yourself (and other managers) as managers. New query, then run, using lower-case emails:
   ```sql
   insert into public.app_admins (email) values ('meg@yourdomain.com'), ('lany@yourdomain.com');
   ```

### 2. Login settings in Supabase
1. **Authentication > Sign In / Providers > Email**: make sure Email is on. Turn **off** "Allow new users to sign up" (we create logins ourselves, so the site stays invite-only).
2. **Authentication > URL Configuration**: set **Site URL** to the website address (e.g. `https://cast-calendar.vercel.app`). Under **Redirect URLs**, add `https://cast-calendar.vercel.app/auth/confirm` and `http://localhost:3000/auth/confirm`.
3. **Authentication > Emails > Magic Link**: replace the message body with:
   ```html
   <h2>Your Flair Cast Calendar login</h2>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Tap here to log in</a></p>
   <p>Or type this code: <strong>{{ .Token }}</strong></p>
   <p>If you didn't ask for this, you can ignore it.</p>
   ```

### 3. Put it online with Vercel
1. In Vercel, click **Add New > Project**, choose the `cast-calendar` repository, click **Import**.
2. Before clicking Deploy, open **Environment Variables** and add these four. The values are in Supabase under **Project Settings > API** (and **API Keys**). Type them straight into Vercel. Never paste them into a chat or into the code.
   - `NEXT_PUBLIC_SUPABASE_URL`: the Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the anon / publishable key
   - `SUPABASE_SERVICE_ROLE_KEY`: the service_role / secret key (this one is secret)
   - `NEXT_PUBLIC_SITE_URL`: the website address, e.g. `https://cast-calendar.vercel.app`
   - `SIGNUP_CODE`: the join code performers type to sign themselves up (make one up, e.g. `FLAIR-STAGE-26`)
3. Click **Deploy**.

### 4. Make the login emails send (Resend)
Supabase's built-in email only sends a couple of emails an hour, so connect Resend:
1. In Resend, add and verify Flair's domain (Resend shows DNS records to add wherever the Flair domain is managed; this can take a few hours to go live).
2. In Resend, create an API key.
3. In Supabase: **Authentication > Emails > SMTP Settings**, turn on custom SMTP: host `smtp.resend.com`, port `465`, username `resend`, password = the Resend API key, sender e.g. `noreply@your-flair-domain`, sender name `Flair`.
4. **Authentication > Rate Limits**: raise "emails per hour" (e.g. to 100) so a whole cast can log in on the same day.

### 5. Add the cast
**Performers can sign themselves up:** send the website address plus `/join` (e.g. `https://cast-calendar.vercel.app/join`) and the join code in the performer group chat. They fill in their own details and get in straight away. They show as **NEW** on the Cast list until a manager confirms them on their profile (tick **Confirmed**, then Save). New sign-ups aren't counted on the Overview until they're confirmed. If someone signs up who shouldn't have, untick **Active** on their profile to switch off their access. If the code gets passed round outside Flair, change `SIGNUP_CODE` in Vercel and redeploy.

**Or managers can add people:**
Managers: **Add cast** page, upload the spreadsheet (columns `full_name,email,phone,roles,location,skills`). Then send everyone the website address. They enter their email, get a link and a 6-digit code, and they're in. They stay logged in on that phone. Tell them to add it to their home screen (instructions are on their My details page).

## Removing the fake test data
In Supabase SQL Editor run:
```sql
delete from public.cast_members where is_test;
```
Their availability and regular weeks are deleted with them.

## Running it on your computer
1. Install Node.js (LTS) from nodejs.org.
2. In this folder: copy `.env.example` to `.env.local` and fill in the values (same as step 3 above, with `NEXT_PUBLIC_SITE_URL=http://localhost:3000`).
3. Run `npm install`, then `npm run dev`, and open http://localhost:3000.

## How to make a change
Open this folder in Claude Code and describe the change. It follows the rules in `CLAUDE.md`: it works on a new branch, shows you the change running on your computer, pushes it so Vercel gives a preview link, and only puts it live (merges into `main`) when you say "go live".

Things you can change in one place: roles, locations, the "out of date" number of days and the time-of-day options are all in `lib/config.ts`.

## How the security works (for whoever maintains this)
- Every table has Row Level Security. Performers can read and change only their own rows; managers (emails in `app_admins`) can read everything. See the migration file.
- Performers can only edit their name, phone, location and skills. Roles, active and email are changed by managers through server code.
- The secret service role key is only used in `lib/supabase/admin.ts`, which can't be imported into browser code, and only after a server-side manager check (or to check an email is on the roster at login).
- Logins: the login page only sends an email if the address is an active cast member or a manager. Self sign-up (`/join`) needs the join code (`SIGNUP_CODE`, server only) and creates the login on the server, so Supabase's own "Allow new users to sign up" stays off.
- Search engines are blocked (`robots.txt` and a `noindex` header on every page).

## Ideas for next features
- Flair bookings shown on the calendar (so double bookings show up)
- Monthly reminder email: "check your dates are up to date"
- Export a Compare grid to share with a client
- Manager page to add/remove managers instead of using SQL
