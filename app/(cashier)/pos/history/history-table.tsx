'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Panel, TableShell } from '@/components/owner/widgets'
import { peso } from '@/lib/mock-data'
import type { OrderRow } from '@/lib/supabase/queries'

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
  } catch {
    return iso
  }
}

export function HistoryTable({ orders }: { orders: OrderRow[] }) {
  const [query, setQuery] = useState('')
  const [method, setMethod] = useState('All Methods')

  const filtered = useMemo(
    () =>
      orders.filter(
        (o) =>
          (method === 'All Methods' || o.payment_method === method) &&
          String(o.id).includes(query.trim())
      ),
    [orders, method, query]
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-44 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search order no."
            aria-label="Search order number"
            className="h-11 w-full rounded-xl border border-olive-900/20 bg-white pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
          />
        </div>
        <label className="sr-only" htmlFor="hist-method">Payment method</label>
        <select
          id="hist-method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="h-11 cursor-pointer rounded-xl border border-olive-900/20 bg-white px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
        >
          {['All Methods', 'cash'].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <p className="ml-auto text-sm font-semibold text-olive-900" role="status">
          {filtered.length} order{filtered.length === 1 ? '' : 's'}
        </p>
      </div>

      <Panel className="p-4">
        {filtered.length === 0 ? (
          <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-stone-500">
            No orders match the current filters.
          </p>
        ) : (
          <TableShell headers={['Order no.', 'Items', 'Cashier', 'Time', 'Method', 'Total', 'Status']}>
            {filtered.map((o) => (
              <tr key={o.id} className="transition-colors hover:bg-cream-100/70">
                <td className="px-4 py-2.5 font-semibold">#{o.id}</td>
                <td className="px-4 py-2.5">{o.items}</td>
                <td className="px-4 py-2.5">{o.cashier}</td>
                <td className="px-4 py-2.5">{fmtTime(o.created_at)}</td>
                <td className="px-4 py-2.5 capitalize">{o.payment_method}</td>
                <td className="px-4 py-2.5 font-semibold">{peso(o.total)}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center rounded-md bg-green-700 px-2.5 py-0.5 text-xs font-semibold text-cream-50 capitalize">
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>
    </div>
  )
}
