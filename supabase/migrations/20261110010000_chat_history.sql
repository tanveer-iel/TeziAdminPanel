-- AI Chat history shown on the admin "AI Chat" page (/chat_history).
create table if not exists public.chat_history (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  symbol     text,
  question   text,
  answer     text,
  created_at timestamptz not null default now()
);

create index if not exists chat_history_created_at_idx on public.chat_history (created_at desc);
create index if not exists chat_history_user_id_idx    on public.chat_history (user_id);

alter table public.chat_history enable row level security;

-- Admins (super / IEL / any active admin user) can read everything.
drop policy if exists "chat_history_admin_read" on public.chat_history;
create policy "chat_history_admin_read" on public.chat_history for select to authenticated
  using (
    public.is_super_admin() or public.is_iel_admin()
    or exists (select 1 from public.admin_users u where u.user_id = auth.uid() and u.active)
  );

-- App users can read and add their own chats.
drop policy if exists "chat_history_own_read" on public.chat_history;
create policy "chat_history_own_read" on public.chat_history for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "chat_history_own_insert" on public.chat_history;
create policy "chat_history_own_insert" on public.chat_history for insert to authenticated
  with check (user_id = auth.uid());

grant select, insert on public.chat_history to authenticated;
grant all on public.chat_history to service_role;
