import { BellRing } from 'lucide-react'
import { PageHeader } from '@/components/owner/page-header'
import { AlertsClient } from './alerts-client'
import { getIngredients } from '@/lib/supabase/queries'

/** Owner low-stock alerts — computed live from the ingredients ledger. */
export default async function LowStockAlertsPage() {
  const { data, error } = await getIngredients()

  if (error || !data) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          icon={<BellRing className="size-5" aria-hidden="true" />}
          title="Low-Stock Alerts"
          subtitle="Restock before a sale has to stop."
        />
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-8 text-center text-sm font-semibold text-red-700">
          {error ?? 'Could not load alerts.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        icon={<BellRing className="size-5" aria-hidden="true" />}
        title="Low-Stock Alerts"
        subtitle="Restock before a sale has to stop."
      />
      <AlertsClient initial={data} />
    </div>
  )
}
