-- Admin roles & users for the Tezi Admin Panel.
--
-- Adds:
--   admin_roles  role -> list of menu keys it may see (editable by the Super Admin)
--   admin_users  which auth user has which role (editable by the Super Admin)
--   is_super_admin(), get_my_access()
-- and adds policies so any role holding the 'financial_statements' menu
-- (e.g. Accounts) can write Financial Statements.
--
-- Built-in Super Admin: tanveer@iel.net.pk (bootstrap list below), with or without an
-- admin_users row. Others get the Super Admin role in the dashboard.
-- Safe to run more than once. Does not touch any existing data.
--
-- NOTE: panel visibility is enforced in the UI. Existing data tables still allow ANY
-- signed-in user (including mobile-app users) through RLS.

create table if not exists public.admin_roles (
  role        text primary key check (role ~ '^[a-z0-9_]{2,32}$'),
  label       text not null,
  menus       text[] not null default '{}',
  is_system   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text,
  role        text not null references public.admin_roles(role) on update cascade,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.admin_roles enable row level security;
alter table public.admin_users enable row level security;

-- Seed roles. Menu keys must match src/lib/adminMenus.ts.
insert into public.admin_roles (role, label, menus, is_system) values
  ('super',    'Super Admin', array['*'], true),
  ('accounts', 'Accounts',    array['financial_statements','withdrawal_requests','raast_ids','contact'], false),
  ('research', 'Research',    array['research_report','symbol_research','research_iel','sectors','sectors_iel','economic_calender','news','blogs'], false)
on conflict (role) do nothing;

-- Who is a Super Admin.
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

-- One call for the panel: { role, menus, is_super, email }.
-- No row (and not a bootstrap super) => role null => the panel denies access.
create or replace function public.get_my_access()
returns json
language plpgsql stable security definer
set search_path = ''
as $$
declare
  r public.admin_users%rowtype;
  m text[];
begin
  if auth.uid() is null then
    return json_build_object('role', null, 'menus', '[]'::json, 'is_super', false);
  end if;
  if public.is_super_admin() then
    return json_build_object('role', 'super', 'menus', '["*"]'::json, 'is_super', true,
                             'email', auth.jwt() ->> 'email');
  end if;
  select * into r from public.admin_users where user_id = auth.uid() and active;
  if not found then
    return json_build_object('role', null, 'menus', '[]'::json, 'is_super', false);
  end if;
  select menus into m from public.admin_roles where role = r.role;
  return json_build_object('role', r.role, 'menus', to_json(coalesce(m, '{}'::text[])), 'is_super', false,
                           'email', r.email, 'full_name', r.full_name);
end;
$$;

revoke all on function public.get_my_access() from public, anon;
grant execute on function public.get_my_access() to authenticated;
grant execute on function public.is_super_admin() to authenticated;

-- Financial Statements writes: super admins + any active role that holds the menu.
-- (is_iel_admin() is left untouched: it is owned by another role, so it cannot be replaced.
--  We add a new function plus extra permissive policies instead; they combine with the old ones.)
create or replace function public.can_edit_financials()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.is_super_admin()
      or exists (
        select 1 from public.admin_users u
          join public.admin_roles r on r.role = u.role
         where u.user_id = auth.uid() and u.active
           and 'financial_statements' = any (r.menus)
      );
$$;
grant execute on function public.can_edit_financials() to authenticated;

-- Each table is attempted separately; if you are not its owner the step is skipped with a
-- NOTICE instead of failing the whole script.
do $$
begin
  if to_regclass('public.finanicial_statements') is not null then
    begin
      drop policy if exists "fin_stmts_role_insert" on public.finanicial_statements;
      create policy "fin_stmts_role_insert" on public.finanicial_statements for insert to authenticated
        with check (public.can_edit_financials());
      drop policy if exists "fin_stmts_role_update" on public.finanicial_statements;
      create policy "fin_stmts_role_update" on public.finanicial_statements for update to authenticated
        using (public.can_edit_financials()) with check (public.can_edit_financials());
      drop policy if exists "fin_stmts_role_delete" on public.finanicial_statements;
      create policy "fin_stmts_role_delete" on public.finanicial_statements for delete to authenticated
        using (public.can_edit_financials());
    exception when insufficient_privilege then
      raise notice 'SKIPPED finanicial_statements policies: not the table owner';
    end;
  end if;
  if to_regclass('public.financial_years') is not null then
    begin
      drop policy if exists "fin_years_role_insert" on public.financial_years;
      create policy "fin_years_role_insert" on public.financial_years for insert to authenticated
        with check (public.can_edit_financials());
    exception when insufficient_privilege then
      raise notice 'SKIPPED financial_years policy: not the table owner';
    end;
  end if;
end
$$;

-- RLS: roles readable by signed-in users, managed by super admins only.
drop policy if exists "admin_roles_read" on public.admin_roles;
create policy "admin_roles_read" on public.admin_roles for select to authenticated using (true);

drop policy if exists "admin_roles_write" on public.admin_roles;
create policy "admin_roles_write" on public.admin_roles for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- admin_users: you can read your own row; super admins read/manage all.
-- (Creating/deleting the login itself goes through the admin-users Edge Function.)
drop policy if exists "admin_users_read" on public.admin_users;
create policy "admin_users_read" on public.admin_users for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists "admin_users_write" on public.admin_users;
create policy "admin_users_write" on public.admin_users for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- The built-in super role cannot be edited or deleted.
create or replace function public.protect_system_roles()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.is_system then
    raise exception 'System role % cannot be changed or deleted', old.role;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;
drop trigger if exists trg_protect_system_roles on public.admin_roles;
create trigger trg_protect_system_roles before update or delete on public.admin_roles
  for each row execute function public.protect_system_roles();
