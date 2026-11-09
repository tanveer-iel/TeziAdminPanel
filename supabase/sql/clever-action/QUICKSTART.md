# clever-action fix: Quick Start

**Problem:** the live Edge Function `clever-action` fails on every run (HTTP 500). Log:
`PGRST205: Could not find the table 'public.client_holdings_data' in the schema cache`.
The function saves a portfolio summary (works) and then the per-stock holdings into a table that
does not exist.

**Fix:** create the missing table `client_holdings_data` (script 1). The function code already
matches it. Optionally redeploy the function to include a small typo fix (script 2).

**Do not** rename the insert to `client_portfolio_data` (the table Supabase suggested): that is the
cash/totals summary and has no stock columns.

## Where the files are

The project folder is `C:\Websites\TeziAdminPanel` (called "the project folder" below).

| What | Inside the zip | In the project folder |
|---|---|---|
| SQL script and rollback | `1_SQL\` | `supabase\sql\clever-action\` |
| Edge Function code | `2_EdgeFunction\clever-action\index.ts` | `supabase\functions\clever-action\index.ts` |

`supabase` commands must be run from the project folder, not from the unzipped folder.

## What each file does

| # | File | Purpose | Local | Live |
|---|---|---|---|---|
| 1 | `20261109000000_client_holdings_data.sql` | Creates the missing table (only adds a table, changes nothing existing, safe to re-run) | Yes | Yes |
| 2 | `clever-action\index.ts` | The function code (typo fix `body.clientCodea` -> `body.clientCode`; default client code in this copy is `10058`) | Optional test | Optional redeploy (read B4 first) |
| - | `ROLLBACK_client_holdings_data.sql.txt` | Removes the new table (deletes any holdings saved in it) | Only to undo | Only to undo |

The table fixes the error by itself. The function change is not needed to stop the errors.

## Before you start

| Needed for | What |
|---|---|
| Local | Docker Desktop running and the local Supabase stack started (`supabase start`) |
| Function deploy/test | Supabase CLI (`supabase --version` prints a version) |
| Live | Login to the Supabase dashboard for project `bfxmfaakufrmzcxhtgfw` |

---

## A. Apply on LOCAL

### A1. Create the table

1. Open Studio: http://127.0.0.1:54323 -> SQL Editor.
2. Open `20261109000000_client_holdings_data.sql` (folder above) in VS Code, Ctrl+A, Ctrl+C.
3. Paste into the SQL editor and press Run. Expect "Success. No rows returned".

### A2. Check the table

```sql
select to_regclass('public.client_holdings_data');   -- should show: client_holdings_data
select count(*) from public.client_holdings_data;     -- 0 for now
```

### A3. (Optional) Test the function locally

**What it does:** runs the function on your PC against your LOCAL database. The function asks the
real trading API (trade.iel.net.pk:1219) for one client's portfolio and saves it locally: one row in
`client_portfolio_data` plus one row per stock in `client_holdings_data`. Nothing is sent to Live and
the Live schedule is not affected. It copies one client's real balances and holdings into your local
database. Skip A3 if you do not want that.

**Before:** the A1 table must exist (otherwise you get the same PGRST205 error as Live), and Docker
with the local Supabase stack must be running.

**Step 1: serve the function.** Terminal in the project folder:

```
cd C:\Websites\TeziAdminPanel
supabase functions serve clever-action
```

Leave it running. The function's log lines (including errors) appear in this window.

**Step 2: call it.** Open a second terminal.

PowerShell (do NOT use `curl` in PowerShell: there it means a different command):

```powershell
cd C:\Websites\TeziAdminPanel
$line = Get-Content .env.local | Where-Object { $_ -like 'NEXT_PUBLIC_SUPABASE_ANON_KEY=*' }
$key = ($line -replace '^[^=]+=','').Trim()
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:54321/functions/v1/clever-action `
  -Headers @{ Authorization = "Bearer $key" } -ContentType 'application/json' `
  -Body '{"clientCode":"10058"}'
```

Git Bash only (replace KEY with the NEXT_PUBLIC_SUPABASE_ANON_KEY value from `.env.local`; in
Command Prompt use the PowerShell version above instead):

```
curl -X POST http://127.0.0.1:54321/functions/v1/clever-action \
  -H "Authorization: Bearer KEY" \
  -d '{"clientCode":"10058"}'
```

Always send the client code as shown. With an empty body the function uses its built-in default,
which is `10058` in this copy (Live currently uses `10053`).

**Step 3: read the result.**

| What you see | Meaning |
|---|---|
| `success: true`, a `snapshotId`, `holdingsInserted` above 0 | It worked |
| `holdingsInserted: 0` | It worked, but the API returned no stocks for that client |
| 500 with `PGRST205` and `client_holdings_data` | The A1 table is not created locally yet |
| 500 with `API failed with status ...` | The trading API answered with an error |
| 500 with a timeout or fetch error | Your PC cannot reach the trading server (firewall or address restriction). Not a database problem |
| 401 | Wrong key. Re-check `.env.local` |
| Connection refused | `supabase functions serve` is not running |

**Step 4: check the data** (Studio -> SQL Editor):

```sql
select s.created_at, s.client_code, count(h.id) as holdings
  from public.client_portfolio_data s
  left join public.client_holdings_data h on h.snapshot_id = s.id
 group by s.id order by s.created_at desc limit 3;
```

The top row should be your new snapshot with its holdings count. To see the rows themselves:
`select * from public.client_holdings_data limit 20;`

**Step 5: clean up the test data (optional).**

Option 1, no ID needed. The holdings table did not exist before your test, so the only snapshots that
have holdings are test ones. Preview first:

```sql
select s.id, s.created_at, s.client_code, count(h.id) as holdings
  from public.client_portfolio_data s
  join public.client_holdings_data h on h.snapshot_id = s.id
 group by s.id order by s.created_at desc;
```

If only your test runs are listed, delete them (their holdings go with them):

```sql
delete from public.client_portfolio_data
 where id in (select snapshot_id from public.client_holdings_data);
```

Older snapshots are not touched, because none of them have holdings.

Option 2, one specific snapshot. Copy the `snapshotId` value from the function's reply and paste it
between the quotes. It is a long code, NOT the words snapshotId. Example shape:

```sql
delete from public.client_portfolio_data where id = '3f2a1c9e-7b4d-4e21-9a6c-5d8e0f1b2c34';
```

Finally stop the serve window with Ctrl+C.

---

## B. Apply on LIVE (later)

Do this in a quiet period. Takes about 10 minutes.

### B1. Before touching anything

1. Take or confirm a backup: Dashboard -> Database -> Backups.
2. Make sure the dashboard shows project `bfxmfaakufrmzcxhtgfw`.
3. Confirm the problem still exists: Dashboard -> Edge Functions -> `clever-action` -> Logs shows
   500 with the `client_holdings_data` message.

### B2. Create the table

1. Open https://supabase.com/dashboard/project/bfxmfaakufrmzcxhtgfw/sql/new
2. Paste the whole of `20261109000000_client_holdings_data.sql` and press Run.
3. Verify: `select to_regclass('public.client_holdings_data');`

### B3. Confirm the fix

Wait for the next scheduled run (the log showed roughly one a minute). In the function logs the
next entry should be **200** with no `PGRST205`. Then:

```sql
select count(*) from public.client_holdings_data;     -- should now grow
```

### B4. (Optional) Deploy the typo fix. READ THIS FIRST

**The repo copy of the function has the default client code `10058`, but the live function has been
tracking `10053`** (nearly all stored snapshots are for 10053). Deploying the repo copy as it is
would switch which client is tracked. Before deploying, open
`supabase\functions\clever-action\index.ts`, find the line `let clientCode = "10058"` and set it to
the value you want Live to use.

Then, from the project folder:

```
supabase login
supabase link --project-ref bfxmfaakufrmzcxhtgfw
supabase functions deploy clever-action
```

No CLI? Dashboard -> Edge Functions -> `clever-action` -> edit the code, change
`body.clientCodea` to `body.clientCode`, then Deploy. Leave the default client code as it is.

---

## Rollback

1. Open `ROLLBACK_client_holdings_data.sql.txt` (in `1_SQL\` of the zip or
   `supabase\sql\clever-action\` of the project), paste into the SQL editor, Run.
   This deletes the table and every holding stored in it.
2. If you deployed the function change, redeploy your previous code.

After a rollback the function goes back to failing with the same error.

## Known issues in the function (not fixed here)

- **Only one client:** it tracks a single default client code (10053 on Live), about 1,400 snapshots
  a day. If you intended all clients, that needs a separate change.
- **Growth:** each snapshot now also adds one row per stock held. Decide how long to keep history
  (for example delete snapshots older than 30 days).
- **Earlier runs:** snapshots saved before this fix have no holdings and cannot be recovered. New
  runs are complete.
- **TLS checking is switched off** for the trading server (`dangerousAllowUnauthorizedCerts`).
  Fix the server certificate and remove the bypass.
- **Anyone who can reach the function could trigger it** for any client code. Consider requiring a
  secret header or checking the caller.
