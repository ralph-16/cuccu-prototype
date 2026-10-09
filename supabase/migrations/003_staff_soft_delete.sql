-- ============================================================
-- CUCCU-POS: staff soft-delete via profiles.is_active (003)
-- Run ONCE in Supabase Dashboard -> SQL Editor, AFTER 001 and 002.
-- Safe to re-run.
--
-- Why soft-delete: deleting an auth.users row requires the Auth Admin API
-- (service_role key), which never belongs in browser code. Deactivating the
-- profile instead locks the account at BOTH layers:
--   - get_user_role() returns NULL for inactive users, so every RLS policy
--     denies them (USING/WITH CHECK all fail closed).
--   - getSessionRole() returns null, so all app layouts bounce to /login.
-- The Auth user + history stay intact; reactivation is one UPDATE.
-- ============================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_profiles_active_role
ON public.profiles(is_active, role);

-- Lock RLS for deactivated staff: no role resolves, so no policy passes.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role
    FROM public.profiles
    WHERE id = (select auth.uid())
      AND is_active = true;
$$;
