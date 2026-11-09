# Admin Roles & Super Admin dashboard: Quick Start

What this adds: a Super Admin dashboard ("Admin Users & Roles") where you create panel users and
choose which menus each role sees. The sidebar and page access follow the role.

## Where things stand

| Item | Rule |
|---|---|
| Built-in Super Admin | `tanveer@iel.net.pk` (always full access, cannot be demoted or deleted) |
| Other Super Admins | Anyone given the **Super Admin** role in the dashboard (e.g. `tanmalik786@gmail.com`) |
| Roles seeded | `super` (all menus), `accounts`, `research` |
| **Accounts** menus | Financial Statements, Withdrawal Requests, Raast IDs, Contact |
| **Research** menus | Research Report, Symbol Research, Research (IEL), Sectors, Sectors (IEL), Economic Calender, News, Blogs |
| `iel@admin.com` | **Research** (no longer a Super Admin) |
| Anyone else signed in | "No access" until added as a panel user |

Roles and their menus can be changed any time in the dashboard (Roles & menus tab).

## Where the files are

Everything is in the zip `TeziAdminPanel_AdminRoles_Rollout.zip` and also in the project repo.
The project folder is `C:\Websites\TeziAdminPanel` (called "the project folder" below).

| What | Inside the zip | In the project folder |
|---|---|---|
| SQL scripts and rollback | `1_SQL\` | `supabase\sql\admin-roles\` |
| Edge Function | `2_EdgeFunction\admin-users\index.ts` | `supabase\functions\admin-users\index.ts` |
| Web app files (reference copy) | `3_WebApp-source\src\...` | `src\...` (already there, same paths) |

**The `supabase` and `npm` commands in this guide must be run from the project folder**, not from
the unzipped folder: only the project folder has the Supabase project and the web app. If you work
on another machine, first copy `2_EdgeFunction\admin-users` into that project's
`supabase\functions\` folder and the `3_WebApp-source\src` files over its `src\` folder.

## Before you start: what must be installed

| Needed for | What |
|---|---|
| Local | Docker Desktop running, and the local Supabase stack started (`supabase start`, already the case on your PC) |
| Function deploy | Supabase CLI (`supabase --version` should print a version) |
| Web app | Node.js (`npm run dev` / `npm run cf:deploy`), after `npm install` in the project folder |
| Live | A login to the Supabase dashboard for project `bfxmfaakufrmzcxhtgfw` and to Cloudflare (the usual `cf:deploy` access) |

## The SQL scripts (run in this order)

| # | File (in `1_SQL\` of the zip, or `supabase\sql\admin-roles\` of the project) | Run on |
|---|---|---|
| 1 | `20261108000000_admin_roles.sql` | every database |
| 2 | `20261108010000_merge_finance_into_accounts.sql` | only a database that ran an EARLIER version of #1 that had a "Finance" role (your Local did). Live: skip, or run it anyway, it is harmless |
| 3 | `20261108020000_iel_admin_to_research.sql` | every database |
| - | `ROLLBACK_admin_roles.sql.txt` | only to undo |

**How to run a script in the SQL editor:** open the file in VS Code (or Notepad), Ctrl+A, Ctrl+C,
click into the Supabase SQL editor, Ctrl+V, press Run. Paste one whole file at a time and read the
messages before moving to the next.

All scripts are safe to run more than once. They change no existing data.
The old `is_iel_admin()` function is left alone (it belongs to another database role).

Also deployed with this: Edge Function `admin-users` and the web app.

**Order matters: SQL, then function, then web app.** If the web app goes first, every user
sees "No access".

---

## A. Local

Already done on your machine except the items below. To redo or check:

1. SQL: Studio http://127.0.0.1:54323 -> SQL Editor. Run scripts 1, then 2 (only if it had Finance), then 3 (files listed in "The SQL scripts" above).
2. Function: open a terminal **in the project folder** (`cd C:\Websites\TeziAdminPanel`), then run `supabase functions serve admin-users` and leave it running.
3. Web app: another terminal in the project folder: `npm run dev`, then open http://localhost:3000 (reads `.env.local` -> local Supabase).
4. Local test login: `tanveer@iel.net.pk` must exist locally (local data is a copy of live).
   If it says "Invalid email or password", create it in Studio -> Authentication -> Users.

---

## B. Live build: step by step

Do this in a quiet period. Allow about 30 minutes.

### B1. Before touching anything

1. **Backup**: Supabase Dashboard -> Database -> Backups (confirm a recent one, or take a manual one).
   Make sure the dashboard is showing project `bfxmfaakufrmzcxhtgfw`, not another project.
2. **Confirm the built-in Super Admin can sign in.** Dashboard -> Authentication -> Users, search
   `tanveer@iel.net.pk`. If missing, create it ("Add user", tick Auto Confirm) with a **strong
   password** (never reuse a test password like `123456` on Live). Do not continue until you have
   signed in once with it at the live panel.
3. **List accounts that use the panel.** After rollout, anyone not a Super Admin and not added as
   a panel user sees "No access" (this includes mobile-app customers, which is intended):

   ```sql
   select email, last_sign_in_at from auth.users
    where email ~* '@iel\.net\.pk|admin' order by last_sign_in_at desc nulls last;
   ```
   Staff seen locally: `ikhaq.ahmad@`, `ikhlaq.ahmed@`, `ali.wattoo@`, `waseem.hassan@iel.net.pk`.
   Decide a role for each (you add them in B5).
4. **Check table owners** (explains a possible `SKIPPED` message in B2):

   ```sql
   select schemaname, tablename, tableowner from pg_tables
    where tablename in ('finanicial_statements','financial_years');
   ```

### B2. Run the SQL on Live

Open https://supabase.com/dashboard/project/bfxmfaakufrmzcxhtgfw/sql/new

The script files are in `1_SQL\` (zip) or `C:\Websites\TeziAdminPanel\supabase\sql\admin-roles\`.

1. Paste the **whole** of `20261108000000_admin_roles.sql` -> Run.
   - A notice `SKIPPED finanicial_statements policies` or `SKIPPED financial_years policy` is
     tolerated: it means those tables belong to another database role, so the Accounts role cannot
     edit financial statements / create financial years yet. Everything else still works. Send the
     owner query result (B1.4) to the developer; those statements must run as the owning role.
   - Any other error: **stop**, do not continue, send the full message.
2. Skip `20261108010000_merge_finance_into_accounts.sql` on a Live that never ran the Finance version.
   If unsure, run it anyway: it is harmless when there is no Finance role.
3. Paste `20261108020000_iel_admin_to_research.sql` -> Run. This puts `iel@admin.com` on Research.
   (It does nothing for that email if it has no login on Live.)
4. Verify:

   ```sql
   select role, label, menus from public.admin_roles order by created_at;   -- super, accounts, research
   select email, role, active from public.admin_users;                       -- iel@admin.com = research
   ```

### B3. Deploy the Edge Function (once, then again after any change to it)

Open a terminal in the project folder (`cd C:\Websites\TeziAdminPanel`). The function file is
`supabase\functions\admin-users\index.ts` there (or `2_EdgeFunction\admin-users\index.ts` in the zip).
Then run:

```
supabase login
supabase link --project-ref bfxmfaakufrmzcxhtgfw
supabase functions deploy admin-users
```

No secrets to set: Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
No CLI? Dashboard -> Edge Functions -> Deploy a new function -> name `admin-users` -> paste the
whole content of `index.ts`.

Check: Dashboard -> Edge Functions shows `admin-users` as Active.

### B4. Deploy the web app

1. Make sure the build does not point at Local: in the project folder rename `.env.local` (e.g. to
   `.env.local.off`) so the built-in live URL is used. Rename it back afterwards.
2. In a terminal in the project folder: `npm run cf:deploy`
3. Open the live panel in a **private window** and sign in as `tanveer@iel.net.pk`.
   "Admin Users & Roles" appears at the bottom of the sidebar.

### B5. Create / promote users on Live

Dashboard: Admin Users & Roles -> Users -> **Add user**.

- **Person already has a login** (e.g. a mobile-app account, such as `tanmalik786@gmail.com`):
  enter their email, pick the role, **leave the password blank**. Their password and app profile are
  not touched. Pick **Super Admin** to make them a Super Admin.
- **New person**: email, name, password (8+ characters), role.
- **Edit** (button on the row): change name, phone, role, active/disabled, or set a new password.
  Name and phone are also written to the person's app profile. Changing the email address is not
  supported here.

Add the staff you listed in B1.3 the same way.

SQL alternative (no new login, existing account only):

```sql
insert into public.admin_users (user_id, email, role)
select id, email, 'accounts' from auth.users where email = 'someone@iel.net.pk';
```

### B6. Verify on Live

1. `tanveer@iel.net.pk`: full sidebar plus Admin Users & Roles.
2. An Accounts user: sidebar shows only Financial Statements, Withdrawal Requests, Raast IDs, Contact.
   Typing another URL such as `/Blogs` redirects back to an allowed page.
3. `iel@admin.com`: only the Research menus, and no Admin Users & Roles.
4. An account with no entry: "No access" screen.
5. Accounts user adds a Financial Statement. A row-level-security error means the `SKIPPED` notice
   appeared in B2.

---

## Known limitations (read once)

- **Panel-level, not database-level.** Menus are enforced by the panel. Database rules on
  `widrawrequest`, `raastids`, `contact` and others still allow any signed-in user (including
  mobile-app customers) through the API. Left unchanged on purpose because the mobile app shares
  those tables. Tightening needs a separate, tested change.
- **`iel@admin.com` can still write Financial Statements through the database**, even though the
  panel hides that menu: the older `is_iel_admin()` rule names that email and cannot be changed from
  the SQL editor (owned by another role).
- Signed-out/no-entry accounts only see "No access"; they are not deleted.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "Invalid email or password" | Account does not exist in that database (Local and Live differ in who exists). Create it in Authentication -> Users. |
| Everyone sees "No access" | Web app deployed before the SQL ran, or `get_my_access` missing. Run script 1. |
| Add user: "Edge Function returned a non-2xx" / network error | Function not deployed (Live) or not being served (Local: `supabase functions serve admin-users`). |
| Add user: "Super Admin only" | You are signed in as a non-super account. |
| "A tree hydrated but some attributes of the server rendered HTML didn't match" | Browser extension (password manager, Grammarly, dark mode). Dev-mode only; works in incognito. Not an app bug. |
| Role change not visible to a user | They see it on their next page load/sign-in. |

## Rollback

1. Open `ROLLBACK_admin_roles.sql.txt` (in `1_SQL\` of the zip, or `supabase\sql\admin-roles\` of the
   project), paste it into the SQL editor and Run (removes the new tables, functions and policies).
2. Redeploy the previous web build.
3. In a terminal in the project folder: `supabase functions delete admin-users`

Note: the rollback does not restore `iel@admin.com` as a Super Admin; before this feature the panel
had no roles at all, so everyone who could sign in had full access. Logins created through the
dashboard remain as ordinary accounts (delete them in Authentication if wanted).
