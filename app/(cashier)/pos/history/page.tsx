import { HistoryTable } from './history-table'
import { getRecentOrders } from '@/lib/supabase/queries'

/** Cashier order history — live orders via RLS. */
export default async function CashierHistoryPage() {
  const { data, error } = await getRecentOrders(100)

  if (error || !data) {
    return (
      <p role="alert" className="rounded-2xl bg-red-50 px-4 py-8 text-center text-sm font-semibold text-red-700">
        {error ?? 'Could not load orders.'}
      </p>
    )
  }

  return <HistoryTable orders={data} />
}
