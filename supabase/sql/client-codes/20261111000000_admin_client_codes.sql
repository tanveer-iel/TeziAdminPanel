-- Lets the admin panel's Users page show every customer's Client Code.
--
-- Why: public."ClientCode" has row-level security that lets a signed-in user read ONLY their own row
-- (so a customer cannot see other people's codes). The panel signs in as a staff member, so it saw
-- nobody's code and showed "No codes" for everyone. This function runs with the table owner's rights
-- and returns just (user_id, client_code): never the "Password" column. Only a Super Admin or a panel
-- role that has the "users" menu may call it; everyone else gets an empty result.
--
-- Adds one function. Does not change any table or policy. Safe to run more than once.
-- Run after 20261108000000_admin_roles.sql (needs is_super_admin, admin_users, admin_roles).

create or replace function public.admin_client_codes()
returns table (user_id uuid, client_code text)
language sql
stable
security definer
set search_path = ''
as $$
  select c."userId", c."cliendCode"
    from public."ClientCode" c
   where public.is_super_admin()
      or exists (
           select 1
             from public.admin_users u
             join public.admin_roles r on r.role = u.role
            where u.user_id = auth.uid()
              and u.active
              and ('*' = any (r.menus) or 'users' = any (r.menus))
         );
$$;

revoke all on function public.admin_client_codes() from public, anon;
grant execute on function public.admin_client_codes() to authenticated;

notify pgrst, 'reload schema';
