# Backup of live Edge Functions (2026-11-09)

Copy of the function code that was running on Live **before** the portfolio/admin changes, so it can be
restored if a deploy goes wrong. Kept outside `supabase/functions` so the CLI never serves or deploys it.

| File | What it is |
|---|---|
| `clever-action.index.ts` | The live `clever-action` as the project owner pasted it: default client `10053`, with the `body.clientCodea` typo. Not changed except for removing the repo header comment |

Restore: copy it over `supabase/functions/clever-action/index.ts` and run
`supabase functions deploy clever-action`.

Not backed up because nothing existing is replaced: `admin-users` and `portfolio-sync` are new functions
(rollback = delete them in Dashboard -> Edge Functions). `swift-responder` is unchanged.
