import { FileText, FileBarChart } from 'lucide-react'
import { PageHeader } from '@/components/owner/page-header'
import { Panel, TableShell } from '@/components/owner/widgets'
import { peso } from '@/lib/mock-data'
import { getRecentOrders, getSalesSummary, getSalesTrend } from '@/lib/supabase/queries'
import { salesSummaryQuerySchema } from '@/lib/validations/order'

function TrendChart({ data }: { data: number[] }) {
  const w = 900
  const h = 220
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 16 - (v / max) * (h - 40)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-52 w-full" role="img" aria-label="Monthly completed-sales trend, this year">
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill="rgba(107,119,66,0.15)" stroke="none" />
      <polyline points={pts} fill="none" stroke="#556030" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * w
        const y = h - 16 - (v / max) * (h - 40)
        return <circle key={i} cx={x} cy={y} r="4" fill="#556030" />
      })}
    </svg>
  )
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return iso
  }
}

/** Owner reports — live get_sales_summary RPC (Asia/Manila) + real orders. */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const raw = await searchParams
  const parsed = salesSummaryQuerySchema.safeParse(raw)
  const from = parsed.success ? parsed.data.from : undefined
  const to = parsed.success ? parsed.data.to : undefined

  const [summary, orders, trend] = await Promise.all([
    getSalesSummary(from, to),
    getRecentOrders(20),
    getSalesTrend(),
  ])

  if (summary.error || !summary.data) {
    return (
      <p role="alert" className="rounded-2xl bg-red-50 px-4 py-8 text-center text-sm font-semibold text-red-700">
        {summary.error ?? 'Could not load report.'}
      </p>
    )
  }

  const s = summary.data
  const cards = [
    { label: 'Total Revenue', value: peso(s.total_revenue) },
    { label: 'Orders', value: String(s.order_count) },
    { label: 'Avg. Order Value', value: peso(s.average_order_value) },
    { label: 'Cash Revenue', value: peso(s.revenue_by_payment_method.cash) },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader icon={<FileText className="size-5" aria-hidden="true" />} title="Reports" subtitle={`Showing ${s.from_date} → ${s.to_date} (Asia/Manila).`} />

      <form className="flex flex-wrap items-center gap-2" aria-label="Report date range">
        <label className="text-sm font-semibold text-olive-900">
          From{' '}
          <input
            type="date"
            name="from"
            defaultValue={from ?? s.from_date}
            className="h-10 rounded-xl border border-olive-900/20 bg-white px-3 text-sm"
          />
        </label>
        <label className="text-sm font-semibold text-olive-900">
          To{' '}
          <input
            type="date"
            name="to"
            defaultValue={to ?? s.to_date}
            className="h-10 rounded-xl border border-olive-900/20 bg-white px-3 text-sm"
          />
        </label>
        <button
          type="submit"
          className="h-10 cursor-pointer rounded-xl bg-olive-950 px-4 text-sm font-bold text-cream-50 hover:bg-olive-900"
        >
          Apply
        </button>
        {parsed.success === false ? (
          <p role="alert" className="text-sm font-medium text-red-700">Dates must be YYYY-MM-DD.</p>
        ) : null}
      </form>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-olive-900/10 bg-white p-4 text-center">
            <p className="text-[13px] font-semibold text-stone-500">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-olive-950 tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>

      <Panel className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-wide text-olive-950 uppercase">
              <FileBarChart className="size-5" aria-hidden="true" /> Reports
            </h2>
            <p className="text-sm font-semibold text-olive-950">Completed sales by month, this year</p>
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-olive-900/15 bg-white p-3">
          <TrendChart data={(trend.data ?? []).map((b) => b.total)} />
          <div className="flex justify-between px-1 text-[11px] font-medium text-stone-400">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>
      </Panel>

      <Panel className="p-4 sm:p-6">
        <h2 className="text-lg font-bold tracking-wide text-olive-950 uppercase">Recent Orders</h2>
        <div className="mt-3">
          <TableShell headers={['Order no.', 'Items', 'Cashier', 'Time', 'Payment', 'Total']}>
            {(orders.data ?? []).map((o) => (
              <tr key={o.id} className="transition-colors hover:bg-cream-100/70">
                <td className="px-4 py-2.5 font-semibold">#{o.id}</td>
                <td className="px-4 py-2.5">{o.items}</td>
                <td className="px-4 py-2.5">{o.cashier}</td>
                <td className="px-4 py-2.5">{fmtTime(o.created_at)}</td>
                <td className="px-4 py-2.5 capitalize">{o.payment_method}</td>
                <td className="px-4 py-2.5 font-semibold">{peso(o.total)}</td>
              </tr>
            ))}
          </TableShell>
        </div>
      </Panel>
    </div>
  )
}
