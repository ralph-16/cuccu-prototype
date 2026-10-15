'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/** Signs out everywhere (server), clears the session cookies. */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  // Also clear the prototype/demo session so role switching never leaks
  // the previous demo user. No-op when demo mode is off.
  try {
    const { DEMO_COOKIE } = await import('@/lib/demo/config')
    const { cookies } = await import('next/headers')
    ;(await cookies()).delete(DEMO_COOKIE)
  } catch {
    // ignore — redirect to role selection still happens below.
  }
  revalidatePath('/', 'layout')
  redirect('/login')
}
