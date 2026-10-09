'use client'

import { useMemo, useState } from 'react'
import { CheckCheck, PackagePlus, TriangleAlert } from 'lucide-react'
import { Panel, StockBadge } from '@/components/owner/widgets'
import { recordStockIn, type Ingredient } from '@/lib/supabase/queries'
import { stockStatus } from '@/lib/supabase/stock'
import { cn } from '@/lib/utils'

export function AlertsClient({ initial }: { initial: Ingredient[] }) {
  const [done, setDone] = useState<number[]>([])
  const [filter, setFilter] = useState('All')
  const [notice, setNotice] = useState<string | null>(null)
  const [rows, setRows] = useState(initial)

  const alerts = useMemo(
    () =>
      rows
        .map((r) => ({ ...r, level: stockStatus(r) }))
        .filter((r) => r.level !== 'In Stock')
        .filter((a) => filter === 'All' || a.level === filter),
    [rows, filter]
  )
  const open = alerts.filter((a) => !done.includes(a.id))

  async function restock(id: number) {
    setNotice(null)
    const { error } = await recordStockIn({ ingredient_id: id, quantity: 1, notes: 'Quick restock from alerts' })
    if (error) {
      setNotice(error)
      return
    }
    // Re-fetch state optimistically is complex; mark resolved and let the
    // ledger trigger handle stock. Page refresh shows updated levels.
    setDone((d) => [...d, id])
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, stock_quantity: r.stock_quantity + 1 } : r)))
    setNotice('Restock recorded (+1). Adjust the exact amount in Inventory.')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter alerts">
        {['All', 'Low Stock', 'Out of Stock'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cn(
              'h-9 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none',
              filter === f
                ? 'border-olive-950 bg-olive-950 text-cream-50'
                : 'border-olive-900/25 bg-cream-50 text-olive-900 hover:bg-olive-100'
            )}
          >
            {f}
          </button>
        ))}
        <p className="ml-auto text-sm font-semibold text-olive-900" role="status">
          {open.length} open alert{open.length === 1 ? '' : 's'}
        </p>
      </div>

      {notice ? (
        <p role="status" className="rounded-2xl bg-olive-100 px-4 py-2.5 text-sm font-semibold text-olive-800">
          {notice}
        </p>
      ) : null}

      {open.length === 0 ? (
        <Panel className="p-10 text-center">
          <CheckCheck className="mx-auto size-10 text-olive-500" aria-hidden="true" />
          <p className="mt-2 font-bold text-olive-950">All caught up — no open alerts.</p>
          <p className="text-sm text-stone-500">New low-stock events from sales will appear here.</p>
        </Panel>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {open.map((a) => (
            <li key={a.id}>
              <Panel className="flex h-full flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-bold text-olive-950">
                    <TriangleAlert
                      className={cn('size-5', a.level === 'Out of Stock' ? 'text-red-600' : 'text-yellow-600')}
                      aria-hidden="true"
                    />
                    {a.name}
                  </h2>
                  <StockBadge status={a.level} />
                </div>
                <p className="text-sm text-stone-600 tabular-nums">
                  {a.stock_quantity} {a.unit} left · reorder at {a.reorder_level} {a.unit}
                </p>
                <div className="mt-auto flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => restock(a.id)}
                    className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-olive-700 text-sm font-bold text-cream-50 transition-colors hover:bg-olive-800 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <PackagePlus className="size-4" aria-hidden="true" /> Record Restock
                  </button>
                  <button
                    type="button"
                    onClick={() => setDone((d) => [...d, a.id])}
                    className="h-9 flex-1 cursor-pointer rounded-xl border border-olive-700 text-sm font-bold text-olive-800 transition-colors hover:bg-olive-100 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
                  >
                    Dismiss
                  </button>
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 ? (
        <Panel className="p-4">
          <h2 className="text-sm font-bold text-olive-950">Resolved this session ({done.length})</h2>
        </Panel>
      ) : null}
    </div>
  )
}
