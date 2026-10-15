/**
 * Demo session — role-aware prototype state without real authentication.
 *
 * `getDemoSession()` is the demo counterpart of `getSessionRole()`: it
 * resolves the `cuccu-demo-role` cookie to a predefined demo account.
 * The two demo logins call `demoLogin(role)` — no password, OTP, or
 * backend request. `demoLogout()` clears the cookie (used alongside the
 * regular signOut so role switching never leaks the previous session).
 */
'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { DEMO_COOKIE } from './config'
import { DEMO_CASHIER, DEMO_OWNER } from './data'
import type { AppRole } from '@/lib/auth/role'

export interface DemoSession {
  userId: string
  email: string
  role: AppRole
  fullName: string
}

export async function getDemoSession(): Promise<DemoSession | null> {
  let role: string | undefined
  try {
    role = (await cookies()).get(DEMO_COOKIE)?.value
  } catch {
    return null
  }
  if (role === 'owner') return { ...DEMO_OWNER }
  if (role === 'cashier') return { ...DEMO_CASHIER }
  return null
}

/** One-click demo login. Sets the prototype session cookie, then lands on the role home. */
export async function demoLogin(role: AppRole) {
  if (role !== 'owner' && role !== 'cashier') return
  try {
    ;(await cookies()).set(DEMO_COOKIE, role, {
      path: '/',
      maxAge: 60 * 60 * 12,
      sameSite: 'lax',
    })
  } catch {
    // Cookie store unavailable (e.g. static prerender) — layouts still
    // fall back to /login instead of crashing.
  }
  revalidatePath('/', 'layout')
  redirect(role === 'cashier' ? '/pos/order' : '/dashboard')
}

/** Clears the prototype session (called by signOut and role switching). */
export async function demoLogout() {
  try {
    ;(await cookies()).delete(DEMO_COOKIE)
  } catch {
    // ignore — signOut still redirects to role selection.
  }
  revalidatePath('/', 'layout')
  redirect('/login')
}
