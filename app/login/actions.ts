'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSessionRole } from '@/lib/auth/role'

/**
 * Password login Server Action (in its own file so client components
 * can import it). Role-based landing via profiles.role — never localStorage.
 */
export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    redirect('/login?error=missing')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect('/login?error=invalid')
  }

  revalidatePath('/', 'layout')

  const role = await getSessionRole()
  if (!role) {
    // Deactivated (or profile-less) account: don't leave a useless session behind.
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login?error=disabled')
  }
  redirect(role.role === 'cashier' ? '/pos/order' : '/dashboard')
}
