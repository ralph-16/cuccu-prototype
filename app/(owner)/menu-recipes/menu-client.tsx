'use client'

import { useMemo, useState } from 'react'
import { CupSoda, Search } from 'lucide-react'
import { Panel, StockBadge } from '@/components/owner/widgets'
import { peso } from '@/lib/mock-data'
import type { MenuProduct } from '@/lib/supabase/queries'
import { cn } from '@/lib/utils'

function priceRange(p: MenuProduct) {
  if (p.variants.length === 0) return '—'
  const prices = p.variants.map((v) => v.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max ? peso(min) : `${peso(min)} – ${peso(max)}`
}

function MenuCard({ item, onOpen }: { item: MenuProduct; onOpen: () => void }) {
  return (
    <article className="flex h-full gap-3 rounded-2xl border border-olive-900/10 bg-white p-3 shadow-[0_2px_8px_rgba(46,51,29,0.06)]">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`View ${item.name}`}
        className="grid h-[92px] w-[92px] shrink-0 cursor-pointer place-items-center rounded-xl bg-gradient-to-br from-olive-200 via-cream-200 to-olive-300 text-olive-700 transition-transform focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none motion-safe:hover:scale-[1.03]"
      >
        <CupSoda className="size-10" aria-hidden="true" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="truncate text-[15px] font-bold text-olive-950">{item.name}</h3>
        <p className="text-sm font-bold text-olive-800 tabular-nums">{priceRange(item)}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{item.description ?? '—'}</p>
        <div className="mt-auto flex items-center justify-between pt-1.5">
          <span className="rounded-full bg-olive-100 px-2.5 py-0.5 text-[11px] font-semibold text-olive-800">
            {item.category_name}
          </span>
          <button
            type="button"
            onClick={onOpen}
            aria-label={`More actions for ${item.name}`}
            className="cursor-pointer rounded-full px-2 font-bold tracking-widest text-stone-400 transition-colors hover:bg-cream-100 hover:text-olive-800 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
          >
            •••
          </button>
        </div>
      </div>
    </article>
  )
}

function DetailModal({ item, onClose }: { item: MenuProduct; onClose: () => void }) {
  const [tab, setTab] = useState<'recipe' | 'variants'>('recipe')
  const seen = new Map<string, { ingredient: string; quantity: number; unit: string }>()
  for (const r of item.recipe) {
    const k = `${r.ingredient}|${r.unit}`
    const prev = seen.get(k)
    seen.set(k, prev ? { ...prev, quantity: prev.quantity + r.quantity } : { ...r })
  }
  const recipe = [...seen.values()]
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${item.name} details`}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-olive-950/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-3xl bg-cream-50 p-5 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          autoFocus
          className="absolute top-4 right-4 grid size-9 cursor-pointer place-items-center rounded-full bg-white text-xl leading-none text-stone-500 shadow transition-colors hover:text-olive-900 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
        >
          ×
        </button>
        <div className="grid gap-6 sm:grid-cols-[240px_1fr]">
          <div className="grid min-h-56 place-items-center rounded-2xl bg-gradient-to-br from-olive-200 via-cream-200 to-olive-300 text-olive-700">
            <CupSoda className="size-24" aria-hidden="true" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-olive-800 px-3 py-1 text-xs font-semibold text-cream-50">
              <CupSoda className="size-3.5" aria-hidden="true" /> {item.category_name}
            </span>
            <h2 className="mt-2 text-3xl font-bold text-olive-950">{item.name}</h2>
            <p className="mt-1 text-3xl font-bold text-olive-700 tabular-nums">{priceRange(item)}</p>
            <p className="mt-3 border-t border-olive-900/15 pt-3 text-sm text-stone-600">{item.description ?? '—'}</p>
            <dl className="mt-4 flex divide-x divide-olive-900/15 rounded-2xl border border-olive-900/15 bg-white">
              {[
                ['Category', item.category_name],
                ['Variants', String(item.variants.length)],
                ['Availability', item.is_available ? 'in stock' : 'out of stock'],
              ].map(([k, v]) => (
                <div key={k} className="flex-1 px-4 py-2.5 text-center">
                  <dt className="text-[11px] font-medium text-stone-400">{k}</dt>
                  <dd className="text-sm font-bold text-olive-900">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-11 flex-1 cursor-pointer rounded-xl bg-olive-700 font-bold text-cream-50 transition-colors hover:bg-olive-800 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                ✕ Close
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-olive-900/15 bg-white p-4">
          <div className="flex gap-2" role="tablist" aria-label="Recipe information">
            {(['recipe', 'variants'] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  'cursor-pointer rounded-t-lg px-4 py-1.5 text-xs font-bold capitalize transition-colors focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none',
                  tab === t ? 'bg-olive-800 text-cream-50' : 'bg-cream-200 text-olive-900 hover:bg-olive-100'
                )}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === 'recipe' ? (
            <div className="grid gap-4 pt-3 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold text-olive-950">Recipe Details</h3>
                {recipe.length === 0 ? (
                  <p className="mt-2 text-sm text-stone-500">No recipe mapped yet.</p>
                ) : (
                  <ol className="mt-2 space-y-1.5 rounded-xl bg-olive-50 p-3 text-sm">
                    {recipe.map((r, i) => (
                      <li key={r.ingredient} className="flex justify-between gap-2">
                        <span>
                          {i + 1}. {r.ingredient}
                        </span>
                        <span className="font-semibold text-olive-700 tabular-nums">
                          −{r.quantity} {r.unit}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-olive-950">Availability by Variant</h3>
                <ol className="mt-2 space-y-1.5 rounded-xl bg-olive-50 p-3 text-sm">
                  {item.variants.map((v) => (
                    <li key={v.id} className="flex justify-between gap-2">
                      <span>{v.variant_name}</span>
                      <span className="font-semibold text-olive-700 tabular-nums">{peso(v.price)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : (
            <ul className="grid gap-2 pt-3 sm:grid-cols-2">
              {item.variants.map((v) => (
                <li key={v.id} className="flex items-center justify-between rounded-xl bg-cream-100 px-3 py-2 text-sm">
                  <span className="font-semibold text-olive-950">{v.variant_name}</span>
                  <StockBadge status={v.is_available && item.is_available ? 'In Stock' : 'Out of Stock'} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export function MenuClient({ items }: { items: MenuProduct[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [openId, setOpenId] = useState<number | null>(null)

  const categories = useMemo(() => ['All', ...Array.from(new Set(items.map((m) => m.category_name)))], [items])

  const filtered = useMemo(
    () =>
      items.filter(
        (m) =>
          (category === 'All' || m.category_name === category) &&
          m.name.toLowerCase().includes(query.toLowerCase())
      ),
    [items, query, category]
  )
  const openItem = openId != null ? items.find((m) => m.id === openId) ?? null : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menu items…"
            aria-label="Search menu items"
            className="h-10 w-full rounded-xl border border-olive-900/20 bg-white pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={cn(
                'h-8 cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none',
                category === c
                  ? 'border-olive-950 bg-olive-950 text-cream-50'
                  : 'border-olive-900/25 bg-cream-50 text-olive-900 hover:bg-olive-100'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Panel className="p-10 text-center text-sm text-stone-500">
          No menu items match “{query}”. Try a different search or category.
        </Panel>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-3.5 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((m) => (
            <MenuCard key={m.id} item={m} onOpen={() => setOpenId(m.id)} />
          ))}
        </div>
      )}

      {openItem ? <DetailModal item={openItem} onClose={() => setOpenId(null)} /> : null}
    </div>
  )
}
