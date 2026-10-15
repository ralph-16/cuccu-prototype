/**
 * Browser-local demo store (client only).
 *
 * Server components render the centralized seed; interactive demo writes
 * (new checkout orders, expense entries, restocks, staff edits) persist to
 * localStorage so they survive navigation + refresh without touching the
 * production backend. `resetDemoData()` restores the known seed state for
 * repeated demonstrations.
 */
import type { Expense, OrderRow, StaffProfile } from '@/lib/supabase/queries'

const ORDERS_KEY = 'cuccu-demo-orders'
const EXPENSES_KEY = 'cuccu-demo-expenses'
const STOCK_KEY = 'cuccu-demo-stock'
const USERS_KEY = 'cuccu-demo-users'
const SESSION_KEY = 'cuccu-demo-session'

export function isDemoModeClient(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE !== 'false'
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full/blocked — demo still works in-memory for the session.
  }
}

/* ---------------- demo session (display name) ---------------- */

export function setDemoSessionClient(role: 'owner' | 'cashier') {
  write(SESSION_KEY, {
    role,
    fullName: role === 'owner' ? 'Gian Baldovino' : 'Sean Villangca',
  })
}

export function getDemoCashierName(): string {
  const s = read<{ fullName?: string } | null>(SESSION_KEY, null)
  return s?.fullName ?? 'Demo Cashier'
}

export function clearDemoSessionClient() {
  try {
    window.localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

/* ---------------- orders ---------------- */

export function loadDemoOrderExtras(): OrderRow[] {
  return read<OrderRow[]>(ORDERS_KEY, [])
}

export function mergeDemoOrders(seed: OrderRow[]): OrderRow[] {
  const extras = loadDemoOrderExtras()
  if (extras.length === 0) return seed
  const seen = new Set(seed.map((o) => o.id))
  return [...extras.filter((o) => !seen.has(o.id)), ...seed].sort((a, b) => b.id - a.id)
}

/** Persists a locally-completed checkout and returns the receipt row. */
export function addDemoOrder(input: {
  items: number
  cashier: string
  payment_method: string
  total: number
}): OrderRow {
  const extras = loadDemoOrderExtras()
  const id = Math.max(5000, ...extras.map((o) => o.id)) + 1
  const row: OrderRow = {
    id,
    items: input.items,
    cashier: input.cashier,
    created_at: new Date().toISOString(),
    payment_method: input.payment_method,
    total: input.total,
    status: 'completed',
  }
  write(ORDERS_KEY, [row, ...extras].slice(0, 200))
  return row
}

/* ---------------- expenses ---------------- */

export function loadDemoExpenseExtras(): Expense[] {
  return read<Expense[]>(EXPENSES_KEY, [])
}

export function mergeDemoExpenses(seed: Expense[]): Expense[] {
  const extras = loadDemoExpenseExtras()
  if (extras.length === 0) return seed
  const seen = new Set(seed.map((e) => e.id))
  return [...extras.filter((e) => !seen.has(e.id)), ...seed]
}

export function addDemoExpense(input: Omit<Expense, 'id'>): Expense {
  const extras = loadDemoExpenseExtras()
  const row: Expense = { ...input, id: Date.now() }
  write(EXPENSES_KEY, [row, ...extras].slice(0, 200))
  return row
}

/* ---------------- stock adjustments ---------------- */

export function loadDemoStockAdjustments(): Record<number, number> {
  return read<Record<number, number>>(STOCK_KEY, {})
}

export function addDemoStockAdjustment(ingredientId: number, qty: number) {
  const adj = loadDemoStockAdjustments()
  adj[ingredientId] = (adj[ingredientId] ?? 0) + qty
  write(STOCK_KEY, adj)
}

/* ---------------- users ---------------- */

export function loadDemoUsers(seed: StaffProfile[]): StaffProfile[] {
  const stored = read<StaffProfile[] | null>(USERS_KEY, null)
  return stored ?? seed
}

export function saveDemoUsers(rows: StaffProfile[]) {
  write(USERS_KEY, rows)
}

/* ---------------- reset ---------------- */

export function resetDemoData() {
  if (typeof window === 'undefined') return
  for (const k of [ORDERS_KEY, EXPENSES_KEY, STOCK_KEY, USERS_KEY]) {
    try {
      window.localStorage.removeItem(k)
    } catch {
      // ignore
    }
  }
}
