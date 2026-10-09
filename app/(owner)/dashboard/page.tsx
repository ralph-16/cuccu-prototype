import Link from 'next/link'
import {
  CircleDollarSign,
  LayoutDashboard,
  PackageSearch,
  ReceiptText,
  ScanBarcode,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { PageHeader } from '@/components/owner/page-header'
import { Panel, Sparkline, TableShell } from '@/components/owner/widgets'
import { peso } from '@/lib/mock-data'
import { getIngredients, getRecentOrders, getSalesSummary } from '@/lib/supabase/queries'
import { stockStatus } from '@/lib/supabase/stock'

const KpiIconBg: Record<string, string> = {
  sales: 'bg-leaf-500',
  cogs: 'bg-lake-500',
  stock: 'bg-clay-500',
  payments: 'bg-grape-500',
}

function KpiCard({
  tint,
  icon: Icon,
  iconBg,
  label,
  value,
  spark,
  sparkStroke,
  href,
}: {
  tint: string
  icon: React.ElementType
  iconBg: string
  label: string
  value: string
  spark: number[]
  sparkStroke: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[132px] flex-col justify-between rounded-2xl border border-olive-900/10 p-4 transition-transform focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none motion-safe:group-hover:-translate-y-0.5"
      style={{ backgroundColor: tint }}
    >
      <div className="flex items-center gap-2">
        <span className={`grid size-9 place-items-center rounded-xl text-cream-50 ${KpiIconBg[iconBg] ?? iconBg}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <p className="text-[13px] leading-tight font-medium text-stone-500">{label}</p>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-[26px] leading-8 font-bold text-olive-950 tabular-nums">{value}</p>
        <Sparkline points={spark} stroke={sparkStroke} aria-hidden="true" />
      </div>
    </Link>
  )
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
  } catch {
    return iso
  }
}

/** Owner dashboard — live today summary + recent orders + low-stock count. */
export default async function DashboardPage() {
  const [summary, orders, ingredients] = await Promise.all([
    getSalesSummary(),
    getRecentOrders(6),
    getIngredients(),
  ])

  if (summary.error || !summary.data) {
    return (
      <p role="alert" className="rounded-2xl bg-red-50 px-4 py-8 text-center text-sm font-semibold text-red-700">
        {summary.error ?? 'Could not load dashboard.'}
      </p>
    )
  }

  const s = summary.data
  const lowCount = (ingredients.data ?? []).filter((i) => stockStatus(i) !== 'In Stock').length

  const foot = [
    { icon: ReceiptText, label: 'Total Orders', value: String(s.order_count) },
    { icon: CircleDollarSign, label: 'Total Sales', value: peso(s.total_revenue) },
    { icon: ShieldCheck, label: 'Avg. Order Value', value: peso(s.average_order_value) },
    { icon: ScanBarcode, label: 'Cash Revenue', value: peso(s.revenue_by_payment_method.cash) },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader icon={<LayoutDashboard className="size-5" aria-hidden="true" />} title="Dashboard" subtitle={`Today in Asia/Manila · ${s.from_date}`}>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard tint="#dbe3c6" icon={CircleDollarSign} iconBg="sales" label="Today's Sale" value={peso(s.total_revenue)} spark={[30, 45, 38, 55, 62, 70]} sparkStroke="#4c7a3f" href="/sales-expenses" />
        <KpiCard tint="#d3dcec" icon={PackageSearch} iconBg="cogs" label="Orders Today" value={String(s.order_count)} spark={[40, 35, 48, 44, 52, 50]} sparkStroke="#3e64a8" href="/reports" />
        <KpiCard tint="#e4d9bd" icon={PackageSearch} iconBg="stock" label="Low-Stock Alerts" value={String(lowCount)} spark={[2, 3, 2, 4, 3, 4]} sparkStroke="#a97e2f" href="/low-stock-alerts" />
        <KpiCard tint="#d4cae4" icon={Wallet} iconBg="payments" label="Cash Revenue" value={peso(s.revenue_by_payment_method.cash)} spark={[20, 30, 28, 38, 42, 50]} sparkStroke="#6d4aa3" href="/sales-expenses" />
      </div>

      <Panel className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-olive-950">
            <ReceiptText className="size-5" aria-hidden="true" /> Recent Sales
          </h2>
          <Link
            href="/sales-expenses"
            className="rounded-full border border-olive-900/20 px-3 py-1 text-xs font-semibold text-olive-900 transition-colors hover:bg-olive-100 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
          >
            View All →
          </Link>
        </div>
        <TableShell headers={['Order no.', 'Items', 'Cashier', 'Time', 'Payment Method', 'Total']}>
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
      </Panel>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {foot.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl border border-olive-900/10 bg-cream-50 p-4 shadow-[0_2px_10px_rgba(46,51,29,0.08)]">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-olive-100 text-olive-700">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <p className="text-[13px] font-medium text-stone-500">{label}</p>
            </div>
            <p className="mt-2 text-center text-2xl font-bold text-olive-950 tabular-nums">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
