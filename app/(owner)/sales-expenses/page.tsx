import { ChartColumn } from 'lucide-react'
import { PageHeader } from '@/components/owner/page-header'
import { SalesExpensesClient } from './sales-client'
import { getExpenses, getRecentOrders, getSalesSummary } from '@/lib/supabase/queries'

/** Owner sales & expenses — live gross, order log, and expense ledger. */
export default async function SalesExpensesPage() {
  const [summary, orders, expenses] = await Promise.all([
    getSalesSummary(),
    getRecentOrders(30),
    getExpenses(50),
  ])

  if (summary.error || !summary.data) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          icon={<ChartColumn className="size-5" aria-hidden="true" />}
          title="Sales & Expenses"
          subtitle="Gross today (Asia/Manila) vs recorded expenses."
        />
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-8 text-center text-sm font-semibold text-red-700">
          {summary.error ?? 'Could not load sales.'}
        </p>
      </div>
    )
  }
  if (orders.error || expenses.error) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          icon={<ChartColumn className="size-5" aria-hidden="true" />}
          title="Sales & Expenses"
          subtitle="Gross today (Asia/Manila) vs recorded expenses."
        />
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-8 text-center text-sm font-semibold text-red-700">
          {orders.error ?? expenses.error ?? 'Could not load logs.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={<ChartColumn className="size-5" aria-hidden="true" />}
        title="Sales & Expenses"
        subtitle="Gross today (Asia/Manila) vs recorded expenses."
      />
      <SalesExpensesClient
        gross={summary.data.total_revenue}
        orders={orders.data ?? []}
        initialExpenses={expenses.data ?? []}
      />
    </div>
  )
}
