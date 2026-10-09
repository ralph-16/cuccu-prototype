'use client'

import { useMemo, useState } from 'react'
import { Search, TriangleAlert } from 'lucide-react'
import { Panel, StockBadge, TableShell } from '@/components/owner/widgets'

export interface StockRow {
  id: number
  name: string
  stock: number
  unit: string
  status: 'In Stock' | 'Low Stock' | 'Out of Stock'
}

export function InventoryTable({ rows }: { rows: StockRow[] }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All Status')

  const filtered = useMemo(
    () =>
      rows.filter(
        (s) =>
          (status === 'All Status' || s.status === status) &&
          s.name.toLowerCase().includes(query.toLowerCase())
      ),
    [rows, query, status]
  )

  const lowCount = rows.filter((s) => s.status !== 'In Stock').length

  return (
    <div className="flex flex-col gap-4">
      {lowCount > 0 ? (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-yellow-100 px-4 py-2.5 text-sm font-semibold text-yellow-900">
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          {lowCount} item{lowCount === 1 ? ' is' : 's are'} low or out of stock — tell the manager to restock.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search item name…"
            aria-label="Search stock items"
            className="h-11 w-full rounded-xl border border-olive-900/20 bg-white pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
          />
        </div>
        <label className="sr-only" htmlFor="csh-status">Availability</label>
        <select
          id="csh-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-11 cursor-pointer rounded-xl border border-olive-900/20 bg-white px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
        >
          {['All Status', 'In Stock', 'Low Stock', 'Out of Stock'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <Panel className="p-4">
        {filtered.length === 0 ? (
          <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-stone-500">
            No stock items match the current filters.
          </p>
        ) : (
          <TableShell headers={['Item', 'Available', 'Status']}>
            {filtered.map((s) => (
              <tr key={s.id} className="transition-colors hover:bg-cream-100/70">
                <td className="px-4 py-2.5 font-semibold whitespace-nowrap text-olive-950">{s.name}</td>
                <td className="px-4 py-2.5 font-semibold tabular-nums">
                  {s.stock} {s.unit}
                </td>
                <td className="px-4 py-2.5">
                  <StockBadge status={s.status} />
                </td>
              </tr>
            ))}
          </TableShell>
        )}
        <p className="mt-3 text-center text-xs text-stone-400">
          Stock levels are managed by the Owner/Manager.
        </p>
      </Panel>
    </div>
  )
}
