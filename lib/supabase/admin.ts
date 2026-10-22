import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client for server-side, user-less contexts such as
 * PayMongo webhooks. Bypasses RLS — never expose to the browser.
 * Returns null when the required env vars are missing so callers can degrade
 * gracefully (e.g. in demo/no-backend mode).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Prefer the new Supabase "secret" key (sb_secret_...); fall back to the
  // legacy service_role key for projects that haven't migrated yet.
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}