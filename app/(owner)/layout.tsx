import { redirect } from 'next/navigation'
import { AppShell } from '@/components/owner/shell'
import { getSessionRole } from '@/lib/auth/role'

/**
 * Server-side owner gate. Middleware already guarantees a session;
 * this guarantees the role (profiles.role, never localStorage).
 */
export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionRole()

  if (!session) redirect('/login')
  if (session.role !== 'owner') redirect('/pos/order')

  return <AppShell>{children}</AppShell>
}
