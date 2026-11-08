-- Financial years for the Financial Statements module.
-- The financial year runs July to June and is labelled by the year it starts in:
--   1 Jul 2026 - 30 Jun 2027  ->  'FY 2026-27'
--
-- Adds one new table and one new nullable column. It does not change, move or
-- delete any existing row. Safe to run more than once.

-- Stop before changing anything if this is the wrong database, or if a table
-- called financial_years already exists with a different shape.
do $$
begin
  if to_regclass('public.finanicial_statements') is null then
    raise exception 'public.finanicial_statements was not found. Wrong project? Nothing has been changed.';
  end if;
  if to_regclass('public.financial_years') is not null
     and not exists (
       select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'financial_years' and column_name = 'label'
     ) then
    raise exception 'public.financial_years already exists with a different shape. Nothing has been changed.';
  end if;
end
$$;

create table if not exists public.financial_years (
  id         bigint generated always as identity primary key,
  label      text        not null unique,          -- 'FY 2026-27'
  start_date date        not null,                 -- 2026-07-01
  end_date   date        not null,                 -- 2027-06-30
  created_at timestamptz not null default now(),
  constraint financial_years_july_june check (
    extract(month from start_date) = 7
    and extract(day from start_date) = 1
    and end_date = (start_date + interval '1 year' - interval '1 day')::date
  )
);

-- Link every statement to its financial year. Nullable so existing rows keep
-- working until they are assigned (the admin panel shows them as "Unassigned").
-- Deleting a year row only clears this link; it never deletes a statement.
alter table public.finanicial_statements
  add column if not exists financial_year_id bigint
  references public.financial_years (id) on delete set null;

create index if not exists finanicial_statements_financial_year_id_idx
  on public.finanicial_statements (financial_year_id);

-- Row-level security: signed-in users may read years. Creating years is
-- granted to admins only, in the second migration.
alter table public.financial_years enable row level security;

-- Table privileges (newer Supabase projects do not grant these automatically).
-- Row-level security still decides which rows each role may touch.
grant select, insert on public.financial_years to authenticated;
grant all on public.financial_years to service_role;

drop policy if exists "financial_years_select" on public.financial_years;
create policy "financial_years_select"
  on public.financial_years for select to authenticated using (true);
