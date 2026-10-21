'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CupSoda, Minus, Plus, Search, Trash2 } from 'lucide-react'
import { CashModal, SuccessModal, WalletModal, type PayMethod } from '@/components/cashier/payment-modals'
import { Panel } from '@/components/owner/widgets'
import { peso } from '@/lib/mock-data'
import { createCashOrder } from '@/lib/supabase/queries'
import { cancelWalletOrder, completeWalletOrder } from '@/lib/paymongo'
import { addDemoOrder, getDemoCashierName, isDemoModeClient } from '@/lib/demo/client-store'
import { cn } from '@/lib/utils'

export interface PosMenuItem {
  id: number
  name: string
  price: number
  category: string
  inStock: boolean
}

export function OrderClient({ menu }: { menu: PosMenuItem[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [cart, setCart] = useState<Record<number, number>>({})
  const [method, setMethod] = useState<PayMethod>('Cash')
  const [modal, setModal] = useState<'pay' | 'done' | null>(null)
  const [placing, setPlacing] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [lastOrder, setLastOrder] = useState<{ no: string; total: number; extra: string; method: PayMethod } | null>(null)

  const categories = useMemo(() => ['All', ...Array.from(new Set(menu.map((m) => m.category)))], [menu])

  const filtered = useMemo(
    () =>
      menu.filter(
        (m) =>
          (category === 'All' || m.category === category) &&
          m.name.toLowerCase().includes(query.toLowerCase())
      ),
    [menu, query, category]
  )

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ item: menu.find((m) => m.id === Number(id))!, qty }))
        .filter((l) => l.item && l.qty > 0),
    [menu, cart]
  )
  const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0)

  function setQty(id: number, qty: number) {
    setCart((c) => {
      const next = { ...c }
      if (qty <= 0) {
        delete next[id]
      } else {
        next[id] = qty
      }
      return next
    })
  }

  /** Checkout: creates a pending order + lines, completes it (fires inventory trigger). */
  async function completeOrder(payMethod: PayMethod, receiptDetail: string) {
    setPlacing(true)
    setFormError(null)
    const dbMethod = payMethod.toLowerCase()

    // Demo/prototype mode: simulate checkout locally — no backend write, no
    // real payment. The receipt persists to browser-local demo state and
    // appears in History.
    if (isDemoModeClient()) {
      const itemCount = lines.reduce((s, l) => s + l.qty, 0)
      try {
        const row = addDemoOrder({
          items: itemCount,
          cashier: getDemoCashierName(),
          payment_method: dbMethod,
          total,
        })
        setLastOrder({
          no: String(row.id),
          total,
          method: payMethod,
          extra: `${receiptDetail} (demo — no real payment)`,
        })
        setCart({})
        setModal('done')
      } catch {
        setFormError('Could not save the demo order.')
      }
      setPlacing(false)
      return
    }

    const { orderId, total: charged, error } = await createCashOrder({
      payment_method: dbMethod,
      discount_amount: 0,
      items: lines.map((l) => ({ product_variant_id: l.item.id, quantity: l.qty })),
    })
    setPlacing(false)

    if (error || !orderId) {
      setFormError(error ?? 'Could not place order.')
      return
    }
    const finalTotal = charged ?? total
    setLastOrder({
      no: String(orderId),
      total: finalTotal,
      method: payMethod,
      extra: receiptDetail,
    })
    setCart({})
    setModal('done')
  }

  async function handleWalletConfirm(orderId: number | null) {
    if (isDemoModeClient()) {
      const itemCount = lines.reduce((s, l) => s + l.qty, 0)
      try {
        addDemoOrder({
          items: itemCount,
          cashier: getDemoCashierName(),
          payment_method: method.toLowerCase(),
          total,
        })
      } catch {
        // ignore
      }
    } else if (orderId != null) {
      const r = await completeWalletOrder(orderId)
      if (r.error) setFormError(r.error)
    }
    const detail = `${method} · ${isDemoModeClient() ? "demo — no real charge" : "PayMongo payment received"}`
    await completeOrder(method, detail)
  }

  async function handleWalletCancel(orderId: number | null) {
    if (!isDemoModeClient() && orderId != null) {
      await cancelWalletOrder(orderId)
    }
    setModal(null)
  }

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
            className="h-11 w-full rounded-xl border border-olive-900/20 bg-white pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={cn(
                'h-9 cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none',
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <div>
          {filtered.length === 0 ? (
            <Panel className="p-10 text-center text-sm text-stone-500">No menu items match the current search.</Panel>
          ) : (
            <div className="grid grid-cols-1 items-stretch gap-3.5 sm:grid-cols-2 lg:max-h-[calc(100dvh-19rem)] lg:overflow-y-auto lg:pr-1">
              {filtered.map((m) => (
                <article
                  key={m.id}
                  className={cn(
                    'flex h-full gap-3 rounded-2xl border border-olive-900/10 bg-white p-3 shadow-[0_2px_8px_rgba(46,51,29,0.06)]',
                    !m.inStock && 'opacity-70'
                  )}
                >
                  <span className="grid h-[92px] w-[92px] shrink-0 place-items-center rounded-xl bg-gradient-to-br from-olive-200 via-cream-200 to-olive-300 text-olive-700" aria-hidden="true">
                    <CupSoda className="size-10" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h2 className="truncate text-[15px] font-bold text-olive-950">{m.name}</h2>
                    <p className="text-sm font-bold text-olive-800 tabular-nums">{peso(m.price)}</p>
                    <div className="mt-auto flex items-center justify-between pt-1.5">
                      {m.inStock ? (
                        <span className="rounded-full bg-olive-100 px-2.5 py-0.5 text-[11px] font-semibold text-olive-800">
                          {m.category}
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-600/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
                          Out of stock
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setQty(m.id, (cart[m.id] ?? 0) + 1)}
                        disabled={!m.inStock}
                        aria-label={`Add ${m.name} to order`}
                        className="grid size-11 cursor-pointer place-items-center rounded-xl bg-cream-100 text-xl font-bold text-olive-900 transition-colors hover:bg-olive-200 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus className="size-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <Panel className="flex flex-col p-5 lg:sticky lg:top-5 lg:max-h-[calc(100dvh-3rem)]">
          <h2 className="text-lg font-bold text-olive-950">Current Order</h2>
          {lines.length === 0 ? (
            <p className="grid flex-1 place-items-center py-10 text-sm text-stone-400">No items in order</p>
          ) : (
            <ul className="mt-2 flex-1 space-y-2 overflow-y-auto" aria-label="Order lines">
              {lines.map(({ item, qty }) => (
                <li key={item.id} className="flex items-center gap-2 rounded-xl bg-cream-100 px-2.5 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-olive-950">{item.name}</p>
                    <p className="text-xs text-stone-500 tabular-nums">{peso(item.price)} each</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQty(item.id, qty - 1)}
                      aria-label={`Remove one ${item.name}`}
                      className="grid size-11 cursor-pointer place-items-center rounded-lg bg-white text-olive-900 transition-colors hover:bg-olive-200 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
                    >
                      {qty === 1 ? <Trash2 className="size-4" aria-hidden="true" /> : <Minus className="size-4" aria-hidden="true" />}
                    </button>
                    <span className="w-6 text-center text-sm font-bold tabular-nums" aria-label={`${qty} in order`}>{qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(item.id, qty + 1)}
                      aria-label={`Add one ${item.name}`}
                      className="grid size-11 cursor-pointer place-items-center rounded-lg bg-white text-olive-900 transition-colors hover:bg-olive-200 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <dl className="mt-3 space-y-1 border-t border-olive-900/15 pt-3">
            <div className="flex justify-between text-[15px]">
              <dt className="text-stone-500">Subtotal</dt>
              <dd className="font-bold text-olive-950 tabular-nums" role="status" aria-live="polite">{peso(total)}</dd>
            </div>
            <div className="flex justify-between text-lg">
              <dt className="font-semibold">Total</dt>
              <dd className="font-bold text-olive-950 tabular-nums">{peso(total)}</dd>
            </div>
          </dl>

          <label htmlFor="pay-method" className="mt-3 block text-[13px] font-semibold text-olive-950">
            Payment Method
          </label>
          <select
            id="pay-method"
            value={method}
            onChange={(e) => setMethod(e.target.value as PayMethod)}
            className="mt-1 h-10 w-full cursor-pointer rounded-xl border border-olive-900/20 bg-white px-3 text-sm font-medium text-olive-950 focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
          >
            {(['Cash', 'GCash', 'Maya'] as PayMethod[]).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <p className="mt-2 rounded-xl bg-cream-100 px-3 py-2 text-center text-[12px] font-semibold text-olive-900">
            {method === 'Cash' ? 'Cash on hand' : `${method} — QR / number prototype, no live charge`}
          </p>

          {formError ? (
            <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {formError}
            </p>
          ) : null}

          <button
            type="button"
            disabled={lines.length === 0 || placing}
            onClick={() => setModal('pay')}
            className="mt-4 h-12 cursor-pointer rounded-xl bg-olive-700 text-[15px] font-bold text-cream-50 transition-colors hover:bg-olive-800 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            {placing ? 'Placing order…' : 'Confirm & Send to Kitchen'}
          </button>
        </Panel>
      </div>

      {modal === 'pay' ? (
        method === 'Cash' ? (
          <CashModal
            total={total}
            onClose={() => setModal(null)}
            onConfirm={(t) =>
              completeOrder('Cash', `Cash received ${peso(t)} · Change ${peso(t - total)}`)
            }
          />
        ) : (
          <WalletModal
            total={total}
            method={method}
            items={lines.map((l) => ({ product_variant_id: l.item.id, quantity: l.qty }))}
            onClose={() => setModal(null)}
            onConfirm={handleWalletConfirm}
            onCancel={handleWalletCancel}
          />
        )
      ) : null}
      {modal === 'done' && lastOrder ? (
        <SuccessModal
          orderNo={lastOrder.no}
          total={lastOrder.total}
          method={lastOrder.method}
          extra={lastOrder.extra}
          onClose={() => { setModal(null); router.push('/pos/history'); }}
          onNew={() => setModal(null)}
        />
      ) : null}
    </div>
  )
}
