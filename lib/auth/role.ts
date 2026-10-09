import { createClient } from '@/lib/supabase/server'

export type AppRole = 'owner' | 'cashier'

/**
 * Server-only role lookup. Uses getUser() (verifies the JWT with Supabase)
 * — never getSession() for auth decisions — then reads profiles.role.
 * Returns null when signed out or when no profile row exists yet.
 */
export async function getSessionRole(): Promise<
  { userId: string; email: string | undefined; role: AppRole; fullName: string } | null
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, is_active')
    .eq('id', user.id)
    .single()

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
