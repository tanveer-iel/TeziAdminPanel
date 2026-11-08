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
