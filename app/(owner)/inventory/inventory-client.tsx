'use client'

import { useMemo, useState } from 'react'
import { History, Plus, Search, TriangleAlert } from 'lucide-react'
import { Panel, StockBadge, TableShell } from '@/components/owner/widgets'
import { recordStockIn, type Ingredient } from '@/lib/supabase/queries'
import { stockStatus } from '@/lib/supabase/stock'
import { cn } from '@/lib/utils'

export function InventoryClient({ initial }: { initial: Ingredient[] }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All Status')
  const [rows, setRows] = useState(initial)
  const [restockId, setRestockId] = useState<number | null>(null)
  const [restockQty, setRestockQty] = useState('1')
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(
    () =>
      rows.filter(
        (s) =>
          (status === 'All Status' || stockStatus(s) === status) &&
          s.name.toLowerCase().includes(query.toLowerCase())
      ),
    [rows, query, status]
  )

  const low = rows.filter((s) => stockStatus(s) === 'Low Stock')
  const out = rows.filter((s) => stockStatus(s) === 'Out of Stock')

  async function submitRestock(e: React.FormEvent) {
    e.preventDefault()
    if (restockId == null) return
    setSaving(true)
    setNotice(null)
    const { error } = await recordStockIn({
      ingredient_id: restockId,
      quantity: Number(restockQty),
      notes: 'Manual restock from inventory page',
    })
    setSaving(false)
    if (error) {
      setNotice(error)
      return
    }
    // Optimistic update: ledger trigger adds the same quantity server-side.
    setRows((rs) =>
      rs.map((r) => (r.id === restockId ? { ...r, stock_quantity: r.stock_quantity + Number(restockQty) } : r))
    )
    setNotice('Restock recorded.')
    setRestockId(null)
    setRestockQty('1')
  }

  const selectClass =
    'h-10 cursor-pointer rounded-xl border border-olive-900/20 bg-white px-3 text-sm font-medium text-olive-950 focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search item name…"
            aria-label="Search stock items"
            className="h-10 w-full rounded-xl border border-olive-900/20 bg-white pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
          />
        </div>
        <label className="sr-only" htmlFor="inv-status">Status</label>
        <select id="inv-status" value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
          {['All Status', 'In Stock', 'Low Stock', 'Out of Stock'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {notice ? (
        <p role="status" className="rounded-2xl bg-olive-100 px-4 py-2.5 text-sm font-semibold text-olive-800">
          {notice}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: 'Total Items', value: String(rows.length), tone: 'text-olive-800' },
              { label: 'Low Stock', value: String(low.length), tone: 'text-yellow-700' },
              { label: 'Out of Stock', value: String(out.length), tone: 'text-red-700' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-olive-900/10 bg-white p-3.5 text-center shadow-[0_2px_8px_rgba(46,51,29,0.06)]">
                <p className="text-[13px] font-semibold text-stone-500">{s.label}</p>
                <p className={cn('text-2xl font-bold tabular-nums', s.tone)}>{s.value}</p>
              </div>
            ))}
          </div>

          <Panel className="p-4">
            <h2 className="mb-3 text-lg font-bold text-olive-950">Inventory List</h2>
            {filtered.length === 0 ? (
              <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-stone-500">
                No stock items match the current filters.
              </p>
            ) : (
              <TableShell headers={['Item', 'Stock', 'Reorder At', 'Status', 'Action']}>
                {filtered.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-cream-100/70">
                    <td className="px-4 py-2.5 font-semibold whitespace-nowrap text-olive-950">{s.name}</td>
                    <td className="px-4 py-2.5 font-semibold tabular-nums">
                      {s.stock_quantity} {s.unit}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {s.reorder_level} {s.unit}
                    </td>
                    <td className="px-4 py-2.5">
                      <StockBadge status={stockStatus(s)} />
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => { setRestockId(s.id); setRestockQty('1'); setNotice(null); }}
                        className="h-8 cursor-pointer rounded-lg bg-olive-950 px-3 text-xs font-bold text-cream-50 hover:bg-olive-900"
                      >
                        + Restock
                      </button>
                    </td>
                  </tr>
                ))}
              </TableShell>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-olive-950">
                <TriangleAlert className="size-4 text-red-600" aria-hidden="true" /> Low Stock Alerts
              </h2>
              <a href="/low-stock-alerts" className="text-xs font-semibold text-olive-700 underline-offset-2 hover:underline">
                View All
              </a>
            </div>
            <ul className="space-y-2">
              {[...out, ...low].slice(0, 6).map((a) => (
                <li key={a.id} className="rounded-xl bg-cream-100 px-3 py-2 text-sm">
                  <p className="font-bold text-olive-950">{a.name}</p>
                  <p className="text-xs text-stone-500 tabular-nums">
                    {a.stock_quantity} {a.unit} left · reorder at {a.reorder_level}
                  </p>
                </li>
              ))}
              {low.length + out.length === 0 ? (
                <li className="text-sm text-stone-500">All stocked up.</li>
              ) : null}
            </ul>
          </Panel>
          <Panel className="p-4">
            <h2 className="mb-2 flex items-center gap-1.5 text-[15px] font-bold text-olive-950">
              <History className="size-4" aria-hidden="true" /> Restock
            </h2>
            {restockId == null ? (
              <p className="text-sm text-stone-500">Pick “+ Restock” on any row to record a stock-in entry.</p>
            ) : (
              <form onSubmit={submitRestock} className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-olive-950">
                  {rows.find((r) => r.id === restockId)?.name}
                </p>
                <label className="text-xs font-semibold text-stone-500">
                  Quantity
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-olive-900/20 bg-white px-3 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-olive-700 text-sm font-bold text-cream-50 hover:bg-olive-800 disabled:opacity-40"
                >
                  <Plus className="size-4" aria-hidden="true" /> {saving ? 'Saving…' : 'Record Stock-In'}
                </button>
              </form>
            )}
            <p className="mt-2 text-xs text-stone-400">Ledger is append-only — corrections are new entries.</p>
          </Panel>
        </div>
      </div>
    </div>
  )
}
