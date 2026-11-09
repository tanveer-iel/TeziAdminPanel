-- Demotes iel@admin.com from Super Admin to the Research role.
-- After this, the only built-in Super Admin is tanveer@iel.net.pk (plus anyone given the
-- Super Admin role in the dashboard, e.g. tanmalik786@gmail.com). Safe to run more than once.
-- Run AFTER 20261108000000_admin_roles.sql. Replaces only is_super_admin().
begin;

-- 1. Give iel@admin.com a Research panel role (needs an existing login).
insert into public.admin_users (user_id, email, role, active)
select id, email, 'research', true from auth.users where lower(email) = 'iel@admin.com'
on conflict (user_id) do update set role = 'research', active = true;

-- 2. Remove iel@admin.com from the built-in super list.
create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(lower(auth.jwt() ->> 'email') = any (array['tanveer@iel.net.pk']), false)
      or exists (
        select 1 from public.admin_users u
         where u.user_id = auth.uid() and u.active and u.role = 'super'
      );
$$;

commit;
