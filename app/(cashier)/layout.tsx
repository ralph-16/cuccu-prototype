import { redirect } from 'next/navigation'
import { CashierShell } from '@/components/cashier/shell'
import { getSessionRole } from '@/lib/auth/role'

/**
 * Server-side cashier gate. Any signed-in staff may use the POS
 * (owners use "Open Cashier View"); signed-out users go to /login.
 */
export default async function CashierLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionRole()

  if (!session) redirect('/login')

  return (
    <CashierShell user={{ fullName: session.fullName, role: session.role }}>{children}</CashierShell>
  )
}
