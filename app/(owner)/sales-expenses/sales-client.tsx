'use client'

import { useState } from 'react'
import { Panel, Sparkline, TableShell } from '@/components/owner/widgets'
import { peso } from '@/lib/mock-data'
import { addExpense, type Expense, type OrderRow } from '@/lib/supabase/queries'

const inputClass =
  'h-10 w-full rounded-xl border border-olive-900/20 bg-white px-3 text-sm text-olive-950 focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none'

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return iso
  }
}

export function SalesExpensesClient({
  gross,
  orders,
  initialExpenses,
}: {
  gross: number
  orders: OrderRow[]
  initialExpenses: Expense[]
}) {
  const [expenses, setExpenses] = useState(initialExpenses)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const net = gross - totalExpenses

  async function submit(formData: FormData) {
    setSaving(true)
    setNotice(null)
    const payload = {
      description: String(formData.get('item') ?? ''),
      category: String(formData.get('category') ?? 'Other'),
      amount: Number(formData.get('amount') ?? 0),
      expense_type: String(formData.get('type') ?? 'One-Time'),
      frequency: String(formData.get('frequency') ?? 'One-Time'),
      source: String(formData.get('source') ?? 'Cash on Hand'),
      date_incurred: String(formData.get('date') ?? new Date().toISOString().slice(0, 10)),
      notes: String(formData.get('notes') ?? ''),
    }
    const { error } = await addExpense(payload)
    setSaving(false)
    if (error) {
      setNotice(error)
      return
    }
    setExpenses((es) => [{ id: Date.now(), ...payload }, ...es])
    setNotice('Expense entry saved to the log.')
  }

  const equation = [
    { label: 'Total Gross Sales (₱)', value: peso(gross), tint: '#dbe3c6', spark: [30, 45, 38, 55, 62, 70], stroke: '#4c7a3f', op: null as string | null },
    { label: 'Operating Expenses', value: `-${peso(totalExpenses)}`, tint: '#d3dcec', spark: [35, 42, 38, 46, 44, 48], stroke: '#3e64a8', op: '−' },
    { label: 'NET PROFIT', value: peso(net), tint: '#efe3b4', spark: [20, 30, 28, 38, 42, 50], stroke: '#a97e2f', op: '=' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {equation.map((c) => (
          <div key={c.label} className="relative rounded-2xl border border-olive-900/10 p-4" style={{ backgroundColor: c.tint }}>
            {c.op ? (
              <span aria-hidden="true" className="absolute top-1/2 -left-3.5 hidden size-6 -translate-y-1/2 place-items-center rounded-full bg-olive-900 text-sm font-bold text-cream-50 xl:grid">
                {c.op}
              </span>
            ) : null}
            <p className="text-[13px] font-medium text-stone-500">{c.label}</p>
            <div className="mt-1 flex items-end justify-between gap-2">
              <p className="text-2xl font-bold text-olive-950 tabular-nums">{c.value}</p>
              <Sparkline points={c.spark} stroke={c.stroke} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-lg font-bold text-olive-950">Expense Entry Form</h2>
          {notice ? (
            <p role="status" className="mt-3 rounded-xl bg-olive-100 px-3 py-2 text-sm font-semibold text-olive-800">
              {notice}
            </p>
          ) : null}
          <form
            className="mt-4 flex flex-col gap-3.5"
            action={submit}
          >
            <div>
              <label htmlFor="exp-item" className="mb-1 block text-[13px] font-semibold text-olive-950">Item / Description</label>
              <input id="exp-item" name="item" type="text" required className={inputClass} />
            </div>
            <div>
              <label htmlFor="exp-cat" className="mb-1 block text-[13px] font-semibold text-olive-950">Category</label>
              <select id="exp-cat" name="category" required defaultValue="" className={`${inputClass} cursor-pointer`}>
                <option value="" disabled>Select category…</option>
                <option>Ingredients</option>
                <option>Packaging</option>
                <option>Utilities</option>
                <option>Rent</option>
                <option>Labor</option>
                <option>Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="exp-amt" className="mb-1 block text-[13px] font-semibold text-olive-950">Amount (₱)</label>
                <input id="exp-amt" name="amount" type="number" min="0.01" step="0.01" required inputMode="decimal" className={inputClass} />
              </div>
              <fieldset>
                <legend className="mb-1 text-[13px] font-semibold text-olive-950">Expense Type</legend>
                <div className="flex h-10 items-center gap-4 text-sm">
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input type="radio" name="type" value="Recurring" className="accent-olive-600" /> Recurring
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input type="radio" name="type" value="One-Time" defaultChecked className="accent-olive-600" /> One-Time
                  </label>
                </div>
              </fieldset>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="exp-freq" className="mb-1 block text-[13px] font-semibold text-olive-950">Frequency</label>
                <select id="exp-freq" name="frequency" className={`${inputClass} cursor-pointer`} defaultValue="One-Time">
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                  <option>One-Time</option>
                </select>
              </div>
              <div>
                <label htmlFor="exp-src" className="mb-1 block text-[13px] font-semibold text-olive-950">Payment Source</label>
                <select id="exp-src" name="source" className={`${inputClass} cursor-pointer`} defaultValue="Cash on Hand">
                  <option>Cash on Hand</option>
                  <option>GCash</option>
                  <option>Bank Account</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="exp-date" className="mb-1 block text-[13px] font-semibold text-olive-950">Date Incurred</label>
              <input id="exp-date" name="date" type="date" required className={inputClass} />
            </div>
            <div>
              <label htmlFor="exp-notes" className="mb-1 block text-[13px] font-semibold text-olive-950">Notes / Remarks (Optional)</label>
              <textarea id="exp-notes" name="notes" rows={4} className="w-full rounded-xl border border-olive-900/20 bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none" />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="h-10 cursor-pointer self-center rounded-xl bg-olive-950 px-6 text-sm font-bold text-cream-50 transition-colors hover:bg-olive-900 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-40"
            >
              {saving ? 'Saving…' : '+ Add Expense Entry'}
            </button>
          </form>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel className="flex flex-col p-5">
            <h2 className="text-lg font-bold text-olive-950">Sales Transaction Log</h2>
            <div className="mt-3">
              <TableShell headers={['Order no.', 'Cashier', 'Time', 'Method', 'Total (₱)']}>
                {orders.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-cream-100/70">
                    <td className="px-4 py-2.5 font-semibold">#{s.id}</td>
                    <td className="px-4 py-2.5">{s.cashier}</td>
                    <td className="px-4 py-2.5">{fmtDateTime(s.created_at)}</td>
                    <td className="px-4 py-2.5 capitalize">{s.payment_method}</td>
                    <td className="px-4 py-2.5 font-semibold">{peso(s.total)}</td>
                  </tr>
                ))}
              </TableShell>
            </div>
          </Panel>

          <Panel className="flex flex-col p-5">
            <h2 className="text-lg font-bold text-olive-950">Expense Log</h2>
            <div className="mt-3">
              {expenses.length === 0 ? (
                <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-stone-500">No expenses recorded yet.</p>
              ) : (
                <TableShell headers={['Date', 'Description', 'Category', 'Amount (₱)']}>
                  {expenses.map((e) => (
                    <tr key={e.id} className="transition-colors hover:bg-cream-100/70">
                      <td className="px-4 py-2.5">{e.date_incurred}</td>
                      <td className="px-4 py-2.5 font-semibold">{e.description}</td>
                      <td className="px-4 py-2.5">{e.category}</td>
                      <td className="px-4 py-2.5 font-semibold">{peso(e.amount)}</td>
                    </tr>
                  ))}
                </TableShell>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
