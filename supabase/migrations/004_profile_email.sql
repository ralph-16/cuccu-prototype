-- 004_profile_email.sql
--
-- Store each staff member's email on their profile so the owner roster
-- ("User/Role Management") can show it. Emails otherwise live only in
-- auth.users, which the browser client cannot read without service_role.
--
-- Idempotent and additive: safe to re-run.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Backfill existing rows from auth.users (same database, no API needed).
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id
  AND p.email IS NULL;

-- New staff created from the app (addStaff → auth.signUp → profiles.update)
-- set email explicitly, so no trigger change is required here.
