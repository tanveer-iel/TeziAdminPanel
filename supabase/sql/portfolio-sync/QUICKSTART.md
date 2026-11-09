# portfolio-sync: Quick Start

Replaces the "one client, every minute" approach of `clever-action` with a calendar-aware sync.
`clever-action` is left untouched, so Live keeps working until you retire its schedule.

## What it does

| Mode | Trigger | What happens |
|---|---|---|
| `client` | Customer opens Portfolio in the app (their login) | Refreshes that customer only. Cached 5 minutes. Client code comes from `ClientCode`, never from the request |
| `probe` | Cron 11:00 PKT Mon-Fri | Decides if the exchange traded today, saves it in `market_days`. Eid and other surprise closures are caught this way |
| `active` | Cron every 30 min, 11:00-15:30 PKT | Refreshes clients with a live `trading_auth` session. Runs only if today is open |
| `eod` | Cron 16:00 PKT Mon-Thu, 17:00 Fri | Refreshes all clients and saves a history snapshot. Skipped on a closed day |

History rows (`client_portfolio_data` / `client_holdings_data`) are written only when something changed
(or at end of day). The app reads `client_portfolio_latest` / `client_holdings_latest`.

## How "is the market open" is decided

The probe fetches the probe client's portfolio (default `10053`, change with the function secret
`PROBE_CLIENT_CODE`) and compares custody value and profit/loss with the last snapshot taken before
today's 09:30 PKT. Prices only move when the exchange trades, so a difference means open. This is an
inference, not an exchange feed. It fails open: no baseline, an API error, or an unclear answer all
count as open. An admin can force a day with `update market_days set is_open=false, forced=true where
trade_date = 'YYYY-MM-DD'` (a forced row is never overwritten). **The probe needs an end-of-day
snapshot from the previous trading day as its baseline.**

## Files

| File | Purpose |
|---|---|
| `20261110000000_portfolio_sync.sql` | Tables `market_days`, `client_portfolio_latest`, `client_holdings_latest`, read policies, Realtime. Run after `20261109000000_client_holdings_data.sql` |
| `20261110010000_portfolio_sync_schedule.sql.txt` | Cron jobs (no Vault needed). Edit three values first |
| `ROLLBACK_portfolio_sync.sql.txt` | Drops the three new tables |
| `supabase/functions/portfolio-sync/index.ts` | The function |

## Apply on LOCAL

1. Run `20261110000000_portfolio_sync.sql` in Studio -> SQL Editor.
2. From the project folder: `supabase functions serve` (leave running).
3. Test with the service key (`supabase status -o env`):
   `{"mode":"client","clientCode":"10058"}` then `{"mode":"probe"}`.
   A second client call within 5 minutes returns `cached: true`.
4. Do not run `eod` locally unless you accept copying all 35 clients' data into the local database.

## Apply on LIVE (later; database first, function second, schedule last)

1. Backup. Run `20261110000000_portfolio_sync.sql`.
2. `supabase functions deploy portfolio-sync` (project `bfxmfaakufrmzcxhtgfw`).
3. Test once: `{"mode":"client","clientCode":"10058"}` with the service key.
4. `supabase secrets set CRON_SECRET=<long random text>`, then run the schedule file with the live URL, the anon
   key and that same secret (the service-role key is not stored in the database). Leave the old `clever-action` schedule running for a
   week, check that `client_portfolio_latest` fills and `market_days` has rows, then unschedule the old job.

## Tested locally (client 10058, 9 Nov 2026)

Anon key rejected for `probe`; no login rejected for `client`; client sync saves a snapshot, 5 holdings and
latest rows; repeat within 5 min is cached; after the cache expires unchanged data saves no new snapshot;
probe returns open when the baseline differs and closed when it is identical; `eod` skips on a closed day;
a forced day survives the probe. **Not tested:** a real customer login (`client` mode with a user JWT), the
`eod` run across all clients, and the cron schedule.

## Known limits

- Two simultaneous refreshes of the same client can both call the trading API (harmless duplicate work).
- TLS verification for the trading server is still switched off, as in `clever-action`.
- `client_holdings_data` has no uniqueness rule on `(snapshot_id, security)` yet. Add one once real data confirms a stock never appears twice in one snapshot.
