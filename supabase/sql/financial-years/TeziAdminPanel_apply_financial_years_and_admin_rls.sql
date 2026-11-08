-- TeziAdminPanel: financial years + admin write access for Financial Statements.
-- Runs migration 1 (financial_years) then migration 2 (admin policies) in one go.
-- Paste the WHOLE file into the Supabase SQL editor and run it once.
--
-- What it does NOT do: it never updates, deletes or truncates a statement row,
-- and it never drops or rewrites an existing policy. If any step fails, the
-- whole script is rolled back and nothing is changed. Safe to run more than once.

begin;

-- Give up after 5 seconds instead of queueing behind a busy table and stalling
-- the live app. If this happens, just run the script again.
set local lock_timeout = '5s';

-- Wrong database? Stop before anything is written.
do $$
begin
  if to_regclass('public.finanicial_statements') is null then
    raise exception 'public.finanicial_statements was not found. Wrong project? Nothing has been changed.';
  end if;
end
$$;

-- A copy of today's statements, kept in a schema the API does not expose.
-- Drop it later with:  drop table backup.finanicial_statements_20261107;
create schema if not exists backup;
create table if not exists backup.finanicial_statements_20261107
  as table public.finanicial_statements;
alter table backup.finanicial_statements_20261107 enable row level security;

-- ===== Part 1: 20261107000000_financial_years.sql =====
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

-- ===== Part 2: 20261107010000_financial_statements_admin_rls.sql =====
-- Lets the admin account(s) add, edit and delete Financial Statements.
--
-- Fixes:  new row violates row-level security policy for table "finanicial_statements"
-- That message means RLS is on for the table and no INSERT policy accepts the
-- signed-in user. (The PDF upload to Storage succeeds first, which is why the
-- file can exist even though the row was refused.)
--
-- Only adds a function and policies. It does not change any data, and it does
-- not touch the existing read policy. Run 20261107000000_financial_years.sql
-- first. Safe to run more than once.
--
-- To see what is there today:
--   select policyname, cmd, roles, qual, with_check
--     from pg_policies
--    where schemaname = 'public'
--      and tablename in ('finanicial_statements', 'financial_years');
--   select id, email from auth.users where email = 'iel@admin.com';

do $$
begin
  if to_regclass('public.finanicial_statements') is null
     or to_regclass('public.financial_years') is null then
    raise exception 'Run 20261107000000_financial_years.sql first. Nothing has been changed.';
  end if;
end
$$;

-- 1. Who counts as an admin. Add more addresses to the array as needed.
--    The email comes from the signed-in user's token, so it cannot be set by the browser.
create or replace function public.is_iel_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    lower(auth.jwt() ->> 'email') = any (array['iel@admin.com']),
    false
  );
$$;

-- 2. Admin write access to Financial Statements.
--    RLS policies are permissive: they ADD to whatever policies already exist
--    (for example the read policy the mobile app uses) and never remove any.
drop policy if exists "finanicial_statements_admin_insert" on public.finanicial_statements;
create policy "finanicial_statements_admin_insert"
  on public.finanicial_statements for insert to authenticated
  with check (public.is_iel_admin());

drop policy if exists "finanicial_statements_admin_update" on public.finanicial_statements;
create policy "finanicial_statements_admin_update"
  on public.finanicial_statements for update to authenticated
  using (public.is_iel_admin())
  with check (public.is_iel_admin());

drop policy if exists "finanicial_statements_admin_delete" on public.finanicial_statements;
create policy "finanicial_statements_admin_delete"
  on public.finanicial_statements for delete to authenticated
  using (public.is_iel_admin());

-- 3. Only admins may create financial years. Everyone signed in can still read them.
drop policy if exists "financial_years_insert" on public.financial_years;
create policy "financial_years_insert"
  on public.financial_years for insert to authenticated
  with check (public.is_iel_admin());

commit;
