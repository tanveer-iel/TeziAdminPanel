-- Merges the old "finance" role into "accounts". Only needed on databases that already ran
-- the first version of 20261108000000_admin_roles.sql. Safe to run more than once.
begin;

insert into public.admin_roles (role, label, menus, is_system)
values ('accounts', 'Accounts',
        array['financial_statements','withdrawal_requests','raast_ids','contact'], false)
on conflict (role) do update
  set menus = (select array(select distinct m from unnest(public.admin_roles.menus || excluded.menus) m));

update public.admin_users set role = 'accounts' where role = 'finance';
delete from public.admin_roles where role = 'finance';

commit;
