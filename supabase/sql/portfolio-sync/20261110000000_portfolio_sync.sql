-- Portfolio sync support: market-day calendar + "latest state" tables.
-- Used by the Edge Functions `portfolio-sync` and `market-check`.
-- Run AFTER 20261109000000_client_holdings_data.sql. Adds tables only; safe to run more than once.

-- 1. One row per calendar day: was the stock exchange trading? Written by `market-check`
--    (daily at about 11:00 PKT) or by an admin override (forced = true is never overwritten).
create table if not exists public.market_days (
  trade_date  date primary key,
  is_open     boolean not null,
  source      text,
  detail      jsonb,
  forced      boolean not null default false,
  checked_at  timestamptz not null default now()
);
alter table public.market_days enable row level security;
-- No policies: only the service role (Edge Functions) reads/writes. Panel override comes later.

-- 2. Latest portfolio summary per client (one row per client, updated in place).
--    state_hash lets the sync skip saving a new snapshot when nothing changed.
create table if not exists public.client_portfolio_latest (
  client_code       text primary key,
  snapshot_id       uuid references public.client_portfolio_data(id) on delete set null,
  cash_unblocked    numeric,
  cash_blocked      numeric,
  cash_balance      numeric,
  limit_withdrawal  numeric,
  grand_total       numeric,
  custody_value     numeric,
  total_profit_loss numeric,
  state_hash        text,
  fetched_at        timestamptz not null default now(),
  changed_at        timestamptz not null default now()
);

-- 3. Latest holdings per client and stock (what the mobile app reads).
create table if not exists public.client_holdings_latest (
  client_code          text not null,
  security             text not null,
  quantity             numeric,
  total_cost           numeric,
  cost_per_unit        numeric,
  current_price        numeric,
  current_value        numeric,
  cap_gain_loss        numeric,
  return_of_investment numeric,
  portfolio_weight     numeric,
  api_grand_total      numeric,
  api_avg_cost         numeric,
  updated_at           timestamptz not null default now(),
  primary key (client_code, security)
);
create index if not exists client_holdings_latest_client_idx on public.client_holdings_latest (client_code);

alter table public.client_portfolio_latest enable row level security;
alter table public.client_holdings_latest enable row level security;

-- 4. A signed-in customer may read ONLY their own client code(s) (mapping: public."ClientCode").
drop policy if exists "own portfolio latest" on public.client_portfolio_latest;
create policy "own portfolio latest" on public.client_portfolio_latest
  for select to authenticated
  using (client_code in (select "cliendCode" from public."ClientCode" where "userId" = auth.uid()));

drop policy if exists "own holdings latest" on public.client_holdings_latest;
create policy "own holdings latest" on public.client_holdings_latest
  for select to authenticated
  using (client_code in (select "cliendCode" from public."ClientCode" where "userId" = auth.uid()));

-- 5. Let the app subscribe to live changes of its own rows (Supabase Realtime respects the policies).
do $$
begin
  alter publication supabase_realtime add table public.client_portfolio_latest;
exception when duplicate_object or undefined_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.client_holdings_latest;
exception when duplicate_object or undefined_object then null;
end $$;

notify pgrst, 'reload schema';
