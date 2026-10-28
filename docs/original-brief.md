I'm building a web app called Cast Calendar. I'm not a developer, so explain each step in plain English, tell me exactly what to click when you need me to do something in a browser, and stop at the end of each stage so I can check it.

WHAT IT IS
About 80-100 cast members (performers) each put in their availability. Managers then see everyone's availability on a calendar, filter by performer name, role and location, pick as many cast members as they want and compare their availability side by side. Each performer has a profile with their regular week (day job, classes) and upcoming holidays. For now I only want the framework built well, so I can add features later.

I've attached an HTML prototype (flair-availability-prototype.html) showing how the manager view and the performer view should work. Use it as the reference for layout and behaviour, but rebuild it properly in the tech below.

THE SET-UP (all logged in with our shared company account)
- GitHub stores the code. Use the shared account [GITHUB USERNAME]. Make a PRIVATE repository called cast-calendar under that account, not under an organisation.
- Vercel hosts the website. It deploys automatically when main changes on GitHub. Vercel's free Hobby plan is for personal, non-commercial use only, so we will use the Pro plan ($20 a month). Ask me before upgrading.
- Supabase holds the database and logins. The project is called cast-calendar, in the London region. Build and test on the free plan, then tell me when to upgrade to Pro ($25 a month) before real performers' details go in, so we get daily backups and the project never pauses.
- Resend (free plan) will send the login emails. We set this up in stage 3. The free plan allows 100 emails a day, so keep people logged in (see LOGIN) rather than sending a new email every time. Resend needs a domain we own to send from, so tell me what access I need to the Flair website domain settings.

We don't have any of these accounts yet, so will need to make them during the build process.

TECH CHOICES
- Next.js (App Router) with TypeScript, Tailwind CSS, and Supabase with the @supabase/ssr package.
- UK settings: dates as DD/MM/YYYY, weeks start on Monday, Europe/London time.
- Cast pages are designed for phones first. Manager pages are designed for a laptop first.
- Keep it simple. Don't add libraries we don't need.

DATA (first version)
- cast_members: id, user_id (link to their Supabase login), full_name, email, phone, role (dancer, specialist, actor, singer; keep this list in one place so I can change it), location (UK, Jersey, Europe; keep this list in one place too), skills (free-text tags, e.g. "aerial hoop", "stilts"), active (yes/no), last_updated (set automatically whenever they change their availability, regular week or details).
- availability: one row per cast member per date, with cast_member_id, date, status (available, maybe, unavailable), optional start and end time, and an optional note. Only one row per person per date. A day with nothing marked counts as available, because performers only need to mark the days they can't do. Show unmarked days in a lighter colour so managers can tell them apart from days the performer has confirmed.
- regular_week: a performer's repeating weekly commitments, with cast_member_id, days of the week, start time, end time and a note (e.g. "Day job", Monday to Friday, 09:00 to 17:00). A performer can have more than one.
- app_admins: the emails of the managers who can see everyone.

PAGES
For cast, after they log in:
1. My availability: a month calendar. Tapping a day cycles it through available, maybe and unavailable. They can select a range of days and set them all at once (e.g. a holiday). Show a clear "Saved" message.
2. My regular week: add, edit and remove repeating weekly commitments (e.g. day job Mon-Fri 9-5, classes Tuesday evenings).
3. My details: they can edit their own profile.
For managers:
4. Overview: a month calendar showing how many cast are available each day. Clicking a day shows who is available, with their role and skills.
5. Cast list: a searchable table of all cast, with filters for role, location, skills and active, plus a filter for "not updated in 60+ days". Tick boxes to select as many people as I want, plus "select all filtered".
6. Compare: for the selected cast, a grid with one row per person and one column per date (2 weeks or a month, with next and previous). Colour each cell by status. Show each person's role, location and skills on their row and a count of who is available at the top of each column. Add a "time needed" option (full day, daytime, evening, or custom hours) so a regular weekly commitment that clashes with that time shows as unavailable or partly available, e.g. someone with a 9-5 job is free for an evening rehearsal but not a daytime one. Add a toggle that highlights the days when everyone selected is available.
7. Cast profile: one person's details, their regular week, their upcoming unavailable dates, and when they last updated. Flag anyone who hasn't updated in 60+ days.

LOGIN AND SECURITY (very important: this holds real people's personal details)
- Log in by email with a one-time link or code, using Supabase Auth. Invite-only, with no public sign-up. Managers add or invite cast.
- Cast can only see and change their own details, their own regular week and their own availability. They must never see anyone else's availability or what anyone is booked on. Managers can see everything. Enforce this in the database with Supabase Row Level Security on every table, not just by hiding things on the page.
- Check manager access on the server, never only in the browser.
- The Supabase secret (service role) key must only ever be used in server code and must never reach the browser.
- Never put keys in the code or in git. Use .env.local (make sure it's in .gitignore) and tell me which values to paste into Vercel's Environment Variables.
- Don't ask me to paste passwords or keys into this chat. When a tool needs a login, run the command that opens the browser and I'll log in there.
- Stop search engines from indexing the site.
- Performers each need an access login which is easily accessible for them to be able to login in daily and update their availability. They should not have to request access and should receive immediate access when they login to their account. To do this: let managers upload the cast list from a spreadsheet (CSV) and invite everyone in one go, so each performer gets an email link and is straight in with no approval step. Keep them logged in on their phone for at least 30 days so they don't need a new email every time, and show them how to add the site to their phone's home screen.

HOW TO WORK
- First check what's installed on my computer (git, Node.js LTS, the GitHub CLI "gh" and the Supabase CLI). Install anything missing and tell me what each one is for.
- Log in to GitHub with "gh auth login" through the browser, as the shared account. Set this repository's git name and email to the shared GitHub account.
- Keep the database structure in migration files in the repository, and apply them with the Supabase CLI after I log in through the browser.
- main is the live site. Make each change on a new branch, show it to me running on my computer, then push it, give me the Vercel preview link, and only merge into main when I say "go live".
- Ask me before doing anything that costs money, deletes anything, or makes anything public.
- Write a README.md in plain English (what this is, how to run it, which accounts it uses, how to make a change) and a CLAUDE.md with all the rules above, so future Claude sessions follow them.

STAGES (stop after each one and tell me what to check)
1. Set up the tools, create the project, push it to GitHub, and walk me through importing it into Vercel so a simple "Cast Calendar" home page is live.
2. Create the database tables, the security rules, and 300 FAKE test cast members with random availability and regular weeks for the next 3 months. Mark them clearly as test data so we can delete them later.
3. Login: email links or codes, invite-only, with managers and cast kept separate, plus the spreadsheet upload to invite cast in one go. Walk me through connecting Resend to Supabase so the emails send.
4. Cast pages: My availability, My regular week and My details.
5. Manager pages: Overview, Cast list, Compare and Cast profile.
6. Final check: test as a cast member and as a manager, prove that a cast member can't see anyone else's data, check it on a phone, and update the README with what's built and ideas for the next features.

Start with stage 1.
