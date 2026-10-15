import { createClient } from '@/lib/supabase/server'
import { DEMO_COOKIE, isDemoMode } from '@/lib/demo/config'
import { DEMO_CASHIER, DEMO_OWNER } from '@/lib/demo/data'

export type AppRole = 'owner' | 'cashier'

/**
 * Server-only role lookup. Uses getUser() (verifies the JWT with Supabase)
 * — never getSession() for auth decisions — then reads profiles.role.
 * Returns null when signed out or when no profile row exists yet.
 *
 * In prototype/demo mode (default; see lib/demo/config.ts) the predefined
 * demo cookie session wins so the app works with no backend. Backend code
 * is untouched — set NEXT_PUBLIC_DEMO_MODE=false to use Supabase Auth.
 */
export async function getSessionRole(): Promise<
  { userId: string; email: string | undefined; role: AppRole; fullName: string } | null
> {
  if (isDemoMode()) {
    try {
      const { cookies } = await import('next/headers')
      const demo = (await cookies()).get(DEMO_COOKIE)?.value
      if (demo === 'owner') return { ...DEMO_OWNER }
      if (demo === 'cashier') return { ...DEMO_CASHIER }
    } catch {
      // cookies() unavailable — fall through to Supabase attempt below.
    }
  }

  let supabase
  try {
    supabase = await createClient()
  } catch {
    return null
  }
  let user: { id: string; email?: string } | null = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user ? { id: data.user.id, email: data.user.email ?? undefined } : null
  } catch {
    return null
  }

  if (!user) return null

  let profile: unknown = null
  try {
    const res = await supabase
      .from('profiles')
      .select('role, full_name, is_active')
      .eq('id', user.id)
      .single()
    profile = res.data
  } catch {
    // Backend unreachable — fail closed (layouts redirect to /login).
    return null
  }

  const row = profile as { role?: string; full_name?: string; is_active?: boolean } | null
  // Deactivated staff resolve to signed-out everywhere (layouts + RLS).
  if (!row || row.is_active === false) return null

  const role = row.role as AppRole | undefined
  if (role !== 'owner' && role !== 'cashier') return null

  return {
    userId: user.id,
    email: user.email,
    role,
    fullName: row.full_name ?? user.email ?? 'Staff',
  }
}
