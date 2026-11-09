-- Rule: an account is "Linked" only while it has a saved client code (public."ClientCode" row).
-- This marks every profile that is flagged linked but has NO client code as Unlinked, in both places the
-- apps read it: profiles (account = false, status = 'unlinked') and the sign-in metadata
-- (user_metadata.status = 'unlinked'), the same two things the panel's Unlink button changes.
--
-- Changes only accounts that break the rule. Accounts with a code, and accounts already unlinked, are not
-- touched. Safe to run more than once (the second run changes nothing). The result lists who was changed:
-- keep that list, it is the only record if you ever need to put them back.
-- To preview without changing anything, run the select below on its own first:
--   select email from public.profiles p where p.account
--      and not exists (select 1 from public."ClientCode" c where c."userId" = p.id);

with fixed as (
  update public.profiles p
     set account = false, status = 'unlinked'
   where p.account
     and not exists (select 1 from public."ClientCode" c where c."userId" = p.id)
  returning p.id, p.email
),
meta as (
  update auth.users u
     set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || '{"status":"unlinked"}'::jsonb
   where u.id in (select id from fixed)
  returning u.id
)
select f.email as unlinked_email from fixed f order by f.email;
