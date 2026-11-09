-- Creates the missing table public.client_holdings_data used by the `clever-action` Edge Function.
--
-- Fixes (Live logs): PGRST205 "Could not find the table 'public.client_holdings_data' in the schema cache"
-- The function stores one row per stock in public.client_portfolio_data's snapshot; columns below
-- mirror exactly what the function inserts. Do NOT rename the insert to client_portfolio_data:
-- that table is the cash/totals summary and has no stock columns.
--
-- Security matches client_portfolio_data: RLS on, no policies => only the service role (the Edge
-- Function) can read/write. The mobile app and panel cannot see it. Add a policy later if needed.
--
-- Adds a table only. Does not change existing data or tables. Safe to run more than once.

create table if not exists public.client_holdings_data (
  id                    uuid primary key default gen_random_uuid(),
  snapshot_id           uuid not null references public.client_portfolio_data(id) on delete cascade,
  client_code           text not null,
  security              text,
  quantity              numeric,
  total_cost            numeric,
  cost_per_unit         numeric,
  current_price         numeric,
  current_value         numeric,
  cap_gain_loss         numeric,
  return_of_investment  numeric,
  portfolio_weight      numeric,
  api_grand_total       numeric,
  api_avg_cost          numeric,
  created_at            timestamptz not null default now()
);

create index if not exists client_holdings_data_snapshot_idx on public.client_holdings_data (snapshot_id);
create index if not exists client_holdings_data_client_time_idx on public.client_holdings_data (client_code, created_at desc);

alter table public.client_holdings_data enable row level security;

-- Make PostgREST see the new table immediately (otherwise it can take a moment).
notify pgrst, 'reload schema';
