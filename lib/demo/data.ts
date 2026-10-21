/**
 * Centralized sample dataset for prototype/demo mode.
 *
 * Single source of truth for every demo page (cashier + owner). Dashboard
 * metrics, reports, and charts are DERIVED from `getDemoOrders()` so totals
 * reconcile with the underlying mock transactions. Prices come from
 * `demoMenuVariants`, so POS receipts agree with menu listings.
 *
 * Dates are generated relative to "now" (Asia/Manila day boundaries) with a
 * deterministic PRNG, so every demonstration starts from a known, lively
 * state: ~10 months of backfill for charts + a detailed recent fortnight +
 * a busy "today" for the dashboard. Refreshing never crashes: all getters
 * return fresh arrays with no backend dependency.
 */
import type {
  Expense,
  Ingredient,
  MenuProduct,
  MenuVariant,
  OrderRow,
  SalesSummary,
  StaffProfile,
} from '@/lib/supabase/queries'

/* ------------------------------------------------------------------ */
/* Demo identities (match lib/demo/session.ts + seed profiles below).  */
/* ------------------------------------------------------------------ */

export const DEMO_OWNER = {
  userId: 'demo-owner-1',
  email: 'owner@cuccu.demo',
  role: 'owner' as const,
  fullName: 'Gian Baldovino',
}

export const DEMO_CASHIER = {
  userId: 'demo-cashier-1',
  email: 'cashier@cuccu.demo',
  role: 'cashier' as const,
  fullName: 'Sean Villangca',
}

/* ------------------------------------------------------------------ */
/* Deterministic PRNG (stable dataset across reloads/builds).          */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function manilaDayStart(d: Date): Date {
  // Approximate Asia/Manila (UTC+8) day boundary using fixed offset.
  const utc = d.getTime() + d.getTimezoneOffset() * 60000
  const manila = new Date(utc + 8 * 3600000)
  manila.setHours(0, 0, 0, 0)
  return new Date(manila.getTime() - 8 * 3600000 + d.getTimezoneOffset() * 60000)
}

function isoAt(dayOffset: number, hour: number, minute: number): string {
  const base = manilaDayStart(new Date())
  base.setDate(base.getDate() + dayOffset)
  base.setHours(hour, minute, 0, 0)
  return base.toISOString()
}

function dateOnly(dayOffset: number): string {
  return isoAt(dayOffset, 12, 0).slice(0, 10)
}

/* ------------------------------------------------------------------ */
/* Ingredients (ledger).                                               */
/* ------------------------------------------------------------------ */

const SEED_INGREDIENTS: Ingredient[] = [
  { id: 1, name: 'Espresso Beans', unit: 'kg', stock_quantity: 12, reorder_level: 5, is_available: true },
  { id: 2, name: 'Fresh Milk', unit: 'L', stock_quantity: 8, reorder_level: 10, is_available: true },
  { id: 3, name: 'Black Tea Leaves', unit: 'kg', stock_quantity: 6, reorder_level: 2, is_available: true },
  { id: 4, name: 'Taro Powder', unit: 'kg', stock_quantity: 5, reorder_level: 2, is_available: true },
  { id: 5, name: 'Matcha Powder', unit: 'packs', stock_quantity: 4, reorder_level: 2, is_available: true },
  { id: 6, name: 'Wintermelon Syrup', unit: 'bottles', stock_quantity: 1, reorder_level: 3, is_available: true },
  { id: 7, name: 'Okinawa Syrup', unit: 'bottles', stock_quantity: 5, reorder_level: 3, is_available: true },
  { id: 8, name: 'Tapioca Pearls', unit: 'kg', stock_quantity: 0, reorder_level: 3, is_available: true },
  { id: 9, name: 'Nata de Coco', unit: 'jars', stock_quantity: 2, reorder_level: 4, is_available: true },
  { id: 10, name: 'Chocolate Chips', unit: 'kg', stock_quantity: 6, reorder_level: 2, is_available: true },
  { id: 11, name: 'Caramel Syrup', unit: 'bottles', stock_quantity: 2, reorder_level: 4, is_available: true },
  { id: 12, name: 'Condensed Milk', unit: 'cans', stock_quantity: 15, reorder_level: 6, is_available: true },
  { id: 13, name: 'Sugar Syrup', unit: 'bottles', stock_quantity: 7, reorder_level: 3, is_available: true },
  { id: 14, name: 'Paper Cups 12oz', unit: 'pcs', stock_quantity: 480, reorder_level: 200, is_available: true },
  { id: 15, name: 'Cup Lids & Straws', unit: 'pcs', stock_quantity: 0, reorder_level: 150, is_available: true },
  { id: 16, name: 'Ice', unit: 'bags', stock_quantity: 22, reorder_level: 6, is_available: true },
]

export function getDemoIngredients(): Ingredient[] {
  return SEED_INGREDIENTS.map((i) => ({ ...i }))
}

/* ------------------------------------------------------------------ */
/* Menu: products, variants, recipes.                                  */
/* ------------------------------------------------------------------ */

interface SeedProduct {
  id: number
  name: string
  description: string
  category: string
  is_available: boolean
  variants: Array<{ id: number; variant_name: string; price: number; is_available: boolean }>
  recipe: Array<{ ingredient: string; quantity: number; unit: string }>
  preparation: string[]
}

const SEED_PRODUCTS: SeedProduct[] = [
  {
    id: 1, name: 'Iced Americano', category: 'Coffee', is_available: true,
    description: 'Double-shot espresso over chilled water and ice. Clean, bold, no frills.',
    variants: [
      { id: 1, variant_name: 'Regular', price: 80, is_available: true },
      { id: 2, variant_name: 'Large', price: 95, is_available: true },
    ],
    recipe: [
      { ingredient: 'Espresso Beans', quantity: 0.02, unit: 'kg' },
      { ingredient: 'Ice', quantity: 1, unit: 'bags' },
      { ingredient: 'Paper Cups 12oz', quantity: 1, unit: 'pcs' },
    ],
    preparation: [
      'Brew a double shot of espresso.',
      'Fill a 12oz cup with ice.',
      'Pour the espresso over the ice.',
      'Stir gently and serve.',
    ],
  },
  {
    id: 2, name: 'Spanish Latte', category: 'Coffee', is_available: true,
    description: 'Espresso sweetened with condensed milk and topped with fresh milk.',
    variants: [
      { id: 3, variant_name: 'Hot', price: 100, is_available: true },
      { id: 4, variant_name: 'Iced', price: 110, is_available: true },
    ],
    recipe: [
      { ingredient: 'Espresso Beans', quantity: 0.02, unit: 'kg' },
      { ingredient: 'Condensed Milk', quantity: 0.5, unit: 'cans' },
      { ingredient: 'Fresh Milk', quantity: 0.15, unit: 'L' },
    ],
    preparation: [
      'Pull a double shot of espresso.',
      'Spoon condensed milk into the cup.',
      'Add fresh milk and stir until blended.',
      'Top with espresso; serve hot or over ice.',
    ],
  },
  {
    id: 3, name: 'Kapeng Barako', category: 'Coffee', is_available: true,
    description: 'Strong Batangas barako brew, served black or with a touch of sugar.',
    variants: [
      { id: 5, variant_name: 'Hot', price: 75, is_available: true },
      { id: 6, variant_name: 'Iced', price: 85, is_available: true },
    ],
    recipe: [
      { ingredient: 'Espresso Beans', quantity: 0.025, unit: 'kg' },
      { ingredient: 'Sugar Syrup', quantity: 0.02, unit: 'bottles' },
    ],
    preparation: [
      'Grind barako beans coarsely.',
      'Brew with hot water for 4 minutes.',
      'Strain into a cup.',
      'Sweeten to taste and serve.',
    ],
  },
  {
    id: 4, name: 'Classic Milk Tea', category: 'Milk Tea', is_available: true,
    description: 'House black tea blended with fresh milk and sugar. Our best seller.',
    variants: [
      { id: 7, variant_name: 'Regular', price: 95, is_available: true },
      { id: 8, variant_name: 'Large', price: 110, is_available: true },
    ],
    recipe: [
      { ingredient: 'Black Tea Leaves', quantity: 0.02, unit: 'kg' },
      { ingredient: 'Fresh Milk', quantity: 0.15, unit: 'L' },
      { ingredient: 'Tapioca Pearls', quantity: 0.05, unit: 'kg' },
    ],
    preparation: [
      'Steep black tea leaves in hot water.',
      'Add fresh milk and sugar syrup.',
      'Spoon in cooked tapioca pearls.',
      'Shake with ice and serve.',
    ],
  },
  {
    id: 5, name: 'Wintermelon Milk Tea', category: 'Milk Tea', is_available: true,
    description: 'Refreshing wintermelon syrup with creamy milk and chewy pearls.',
    variants: [
      { id: 9, variant_name: 'Regular', price: 95, is_available: true },
      { id: 10, variant_name: 'Large', price: 110, is_available: true },
    ],
    recipe: [
      { ingredient: 'Wintermelon Syrup', quantity: 0.05, unit: 'bottles' },
      { ingredient: 'Fresh Milk', quantity: 0.15, unit: 'L' },
      { ingredient: 'Tapioca Pearls', quantity: 0.05, unit: 'kg' },
    ],
    preparation: [
      'Pour wintermelon syrup into a shaker.',
      'Add fresh milk and ice.',
      'Shake until frothy.',
      'Pour over tapioca pearls and serve.',
    ],
  },
  {
    id: 6, name: 'Okinawa Milk Tea', category: 'Milk Tea', is_available: true,
    description: 'Roasted brown-sugar Okinawa syrup with fresh milk and nata.',
    variants: [
      { id: 11, variant_name: 'Regular', price: 100, is_available: true },
      { id: 12, variant_name: 'Large', price: 115, is_available: true },
    ],
    recipe: [
      { ingredient: 'Okinawa Syrup', quantity: 0.05, unit: 'bottles' },
      { ingredient: 'Fresh Milk', quantity: 0.15, unit: 'L' },
      { ingredient: 'Nata de Coco', quantity: 0.05, unit: 'jars' },
    ],
    preparation: [
      'Combine Okinawa syrup and fresh milk.',
      'Add nata de coco to the cup.',
      'Pour the milk mixture over ice.',
      'Stir and serve.',
    ],
  },
  {
    id: 7, name: 'Matcha Milk Tea', category: 'Milk Tea', is_available: true,
    description: 'Ceremonial-grade matcha whisked with fresh milk and sugar syrup.',
    variants: [
      { id: 13, variant_name: 'Regular', price: 105, is_available: true },
      { id: 14, variant_name: 'Large', price: 120, is_available: true },
    ],
    recipe: [
      { ingredient: 'Matcha Powder', quantity: 0.2, unit: 'packs' },
      { ingredient: 'Fresh Milk', quantity: 0.15, unit: 'L' },
      { ingredient: 'Sugar Syrup', quantity: 0.02, unit: 'bottles' },
    ],
    preparation: [
      'Whisk matcha powder with warm water.',
      'Add fresh milk and sugar syrup.',
      'Stir until evenly green.',
      'Serve over ice.',
    ],
  },
  {
    id: 8, name: 'Taro Milk Tea', category: 'Milk Tea', is_available: true,
    description: 'Creamy taro with a nutty finish, topped with nata de coco.',
    variants: [
      { id: 15, variant_name: 'Regular', price: 95, is_available: true },
      { id: 16, variant_name: 'Large', price: 110, is_available: true },
    ],
    recipe: [
      { ingredient: 'Taro Powder', quantity: 0.04, unit: 'kg' },
      { ingredient: 'Fresh Milk', quantity: 0.15, unit: 'L' },
      { ingredient: 'Nata de Coco', quantity: 0.05, unit: 'jars' },
    ],
    preparation: [
      'Dissolve taro powder in a little hot water.',
      'Add fresh milk and stir well.',
      'Add nata de coco and ice.',
      'Stir and serve.',
    ],
  },
  {
    id: 9, name: 'Java Chip Frappe', category: 'Frappe', is_available: true,
    description: 'Double espresso blended with chocolate chips, milk, and ice.',
    variants: [
      { id: 17, variant_name: 'Regular', price: 110, is_available: true },
      { id: 18, variant_name: 'Large', price: 125, is_available: true },
    ],
    recipe: [
      { ingredient: 'Espresso Beans', quantity: 0.03, unit: 'kg' },
      { ingredient: 'Chocolate Chips', quantity: 0.03, unit: 'kg' },
      { ingredient: 'Fresh Milk', quantity: 0.12, unit: 'L' },
      { ingredient: 'Ice', quantity: 1, unit: 'bags' },
    ],
    preparation: [
      'Brew espresso and let it cool slightly.',
      'Blend espresso, milk, ice, and chocolate chips.',
      'Pour into a tall cup.',
      'Top with whipped cream and chips.',
    ],
  },
  {
    id: 10, name: 'Caramel Frappe', category: 'Frappe', is_available: true,
    description: 'Espresso and caramel blended thick, finished with caramel drizzle.',
    variants: [
      { id: 19, variant_name: 'Regular', price: 110, is_available: true },
      { id: 20, variant_name: 'Large', price: 125, is_available: false },
    ],
    recipe: [
      { ingredient: 'Espresso Beans', quantity: 0.02, unit: 'kg' },
      { ingredient: 'Caramel Syrup', quantity: 0.05, unit: 'bottles' },
      { ingredient: 'Fresh Milk', quantity: 0.12, unit: 'L' },
    ],
    preparation: [
      'Blend espresso, milk, caramel, and ice.',
      'Pour into a cup.',
      'Top with whipped cream.',
      'Drizzle caramel over the top.',
    ],
  },
  {
    id: 11, name: 'Cookies & Cream Frappe', category: 'Frappe', is_available: true,
    description: 'Crushed cookies blended with milk and ice, crowned with crumbs.',
    variants: [
      { id: 21, variant_name: 'Regular', price: 115, is_available: true },
      { id: 22, variant_name: 'Large', price: 130, is_available: true },
    ],
    recipe: [
      { ingredient: 'Chocolate Chips', quantity: 0.04, unit: 'kg' },
      { ingredient: 'Fresh Milk', quantity: 0.15, unit: 'L' },
      { ingredient: 'Sugar Syrup', quantity: 0.02, unit: 'bottles' },
    ],
    preparation: [
      'Blend milk, ice, and crushed cookies.',
      'Add sugar syrup to taste.',
      'Pour into a cup.',
      'Top with cookie crumbs.',
    ],
  },
  {
    id: 12, name: 'Cheese Pimiento Sandwich', category: 'Others', is_available: true,
    description: 'Toasted white bread with creamy cheese pimiento spread.',
    variants: [{ id: 23, variant_name: 'Solo', price: 65, is_available: true }],
    recipe: [{ ingredient: 'Condensed Milk', quantity: 0.05, unit: 'cans' }],
    preparation: [
      'Spread cheese pimiento on white bread.',
      'Close the sandwich.',
      'Toast until golden.',
      'Slice and serve warm.',
    ],
  },
  {
    id: 13, name: 'Banana Bread Slice', category: 'Others', is_available: true,
    description: 'Moist banana loaf slice, best paired with barako.',
    variants: [{ id: 24, variant_name: 'Slice', price: 55, is_available: true }],
    recipe: [{ ingredient: 'Sugar Syrup', quantity: 0.01, unit: 'bottles' }],
    preparation: [
      'Slice the banana loaf.',
      'Warm briefly if desired.',
      'Plate and serve.',
    ],
  },
  {
    id: 14, name: 'Calamansi Juice', category: 'Others', is_available: true,
    description: 'Fresh-pressed calamansi with honey over ice.',
    variants: [
      { id: 25, variant_name: 'Regular', price: 60, is_available: true },
      { id: 26, variant_name: 'Large', price: 75, is_available: true },
    ],
    recipe: [
      { ingredient: 'Sugar Syrup', quantity: 0.03, unit: 'bottles' },
      { ingredient: 'Ice', quantity: 1, unit: 'bags' },
    ],
    preparation: [
      'Squeeze fresh calamansi.',
      'Add sugar syrup and water.',
      'Pour over ice.',
      'Stir and serve.',
    ],
  },
]

export function getDemoMenu(): MenuVariant[] {
  return SEED_PRODUCTS.flatMap((p) =>
    p.variants.map((v) => ({
      id: v.id,
      product_id: p.id,
      product_name: p.name,
      category_name: p.category,
      variant_name: v.variant_name,
      price: v.price,
      is_available: v.is_available && p.is_available,
    }))
  )
}

export function getDemoMenuWithRecipes(): MenuProduct[] {
  return SEED_PRODUCTS.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category_name: p.category,
    is_available: p.is_available,
    variants: p.variants.map((v) => ({ ...v })),
    recipe: p.recipe.map((r) => ({ ...r })),
    preparation: [...p.preparation],
  }))
}

export function getDemoVariantPrice(variantId: number): number | null {
  for (const p of SEED_PRODUCTS) {
    const v = p.variants.find((x) => x.id === variantId)
    if (v) return v.price
  }
  return null
}

/* ------------------------------------------------------------------ */
/* Orders — one shared ledger; summaries derive from it.               */
/* ------------------------------------------------------------------ */

const CASHIERS = ['Sean Villangca', 'Alex Cruz', 'Reziah Calayag', 'Lenard Montoya']

interface SeedLine {
  v: number // variant id
  q: number // qty
}

function buildOrders(): OrderRow[] {
  const price = (id: number) => getDemoVariantPrice(id) ?? 0
  const rows: OrderRow[] = []
  let id = 1001

  const push = (
    lines: SeedLine[],
    cashier: string,
    created_at: string,
    payment_method: string,
    status = 'completed'
  ) => {
    const items = lines.reduce((s, l) => s + l.q, 0)
    const total = lines.reduce((s, l) => s + price(l.v) * l.q, 0)
    rows.push({ id: id++, items, cashier, created_at, payment_method, total, status })
  }

  // Monthly backfill (Jan → ~2 months ago) so the annual trend chart is
  // meaningful. Deterministic via seeded PRNG.
  const rand = mulberry32(20260214)
  const now = new Date()
  const startYear = now.getFullYear()
  const combos: SeedLine[][] = [
    [{ v: 7, q: 2 }],
    [{ v: 1, q: 1 }, { v: 7, q: 1 }],
    [{ v: 4, q: 1 }],
    [{ v: 17, q: 2 }],
    [{ v: 11, q: 1 }, { v: 23, q: 2 }],
    [{ v: 13, q: 1 }, { v: 24, q: 1 }],
    [{ v: 3, q: 2 }, { v: 25, q: 1 }],
    [{ v: 21, q: 1 }],
    [{ v: 9, q: 3 }],
    [{ v: 5, q: 1 }, { v: 15, q: 1 }],
  ]
  for (let m = 0; m < now.getMonth(); m++) {
    const daysInMonth = new Date(startYear, m + 1, 0).getDate()
    const n = 9 + Math.floor(rand() * 7) // 9–15 orders / month
    for (let k = 0; k < n; k++) {
      const day = 1 + Math.floor(rand() * daysInMonth)
      const hour = 9 + Math.floor(rand() * 10)
      const min = Math.floor(rand() * 60)
      const d = new Date(startYear, m, day, hour, min, 0, 0)
      const combo = combos[Math.floor(rand() * combos.length)]
      const cashier = CASHIERS[Math.floor(rand() * CASHIERS.length)]
      const r = rand()
      const method = r < 0.78 ? 'cash' : r < 0.9 ? 'gcash' : 'maya'
      push(combo, cashier, d.toISOString(), method)
    }
  }
  // A couple of historical refunds for status variety.
  rows[3] = { ...rows[3], status: 'refunded' }
  rows[17] = { ...rows[17], status: 'refunded' }

  // Detailed recent fortnight (relative day offsets), all cash (POS is
  // cash-only) with realistic Intraday times.
  const recent: Array<[SeedLine[], string, number, number, number, string]> = [
    [[{ v: 7, q: 2 }, { v: 23, q: 1 }], 'Sean Villangca', -13, 10, 12, 'cash'],
    [[{ v: 4, q: 1 }], 'Alex Cruz', -13, 15, 40, 'cash'],
    [[{ v: 17, q: 1 }, { v: 18, q: 1 }], 'Reziah Calayag', -12, 11, 5, 'cash'],
    [[{ v: 1, q: 2 }], 'Sean Villangca', -12, 16, 22, 'cash'],
    [[{ v: 11, q: 2 }, { v: 12, q: 1 }], 'Lenard Montoya', -11, 9, 48, 'cash'],
    [[{ v: 13, q: 1 }, { v: 24, q: 2 }], 'Alex Cruz', -11, 13, 31, 'cash'],
    [[{ v: 3, q: 1 }, { v: 4, q: 1 }], 'Sean Villangca', -10, 10, 7, 'cash'],
    [[{ v: 21, q: 2 }], 'Reziah Calayag', -10, 14, 55, 'gcash'],
    [[{ v: 9, q: 1 }, { v: 10, q: 2 }], 'Alex Cruz', -9, 12, 20, 'cash'],
    [[{ v: 5, q: 1 }], 'Lenard Montoya', -9, 17, 2, 'cash'],
    [[{ v: 15, q: 2 }, { v: 25, q: 1 }], 'Sean Villangca', -8, 11, 44, 'cash'],
    [[{ v: 19, q: 1 }], 'Alex Cruz', -8, 15, 18, 'cash'],
    [[{ v: 7, q: 1 }, { v: 8, q: 1 }, { v: 23, q: 2 }], 'Reziah Calayag', -7, 10, 33, 'cash'],
    [[{ v: 2, q: 1 }], 'Lenard Montoya', -7, 16, 41, 'maya'],
    [[{ v: 4, q: 2 }], 'Sean Villangca', -6, 9, 15, 'cash'],
    [[{ v: 13, q: 1 }, { v: 14, q: 1 }], 'Alex Cruz', -6, 13, 27, 'cash'],
    [[{ v: 11, q: 1 }, { v: 24, q: 1 }], 'Reziah Calayag', -5, 12, 9, 'cash'],
    [[{ v: 17, q: 3 }], 'Sean Villangca', -5, 15, 52, 'cash'],
    [[{ v: 1, q: 1 }, { v: 7, q: 1 }], 'Alex Cruz', -4, 10, 24, 'cash'],
    [[{ v: 21, q: 1 }, { v: 22, q: 1 }], 'Lenard Montoya', -4, 14, 13, 'gcash'],
    [[{ v: 3, q: 2 }], 'Sean Villangca', -3, 11, 3, 'cash'],
    [[{ v: 9, q: 2 }, { v: 23, q: 1 }], 'Reziah Calayag', -3, 16, 37, 'cash'],
    [[{ v: 25, q: 2 }], 'Alex Cruz', -2, 9, 58, 'cash'],
    [[{ v: 4, q: 1 }, { v: 19, q: 1 }], 'Sean Villangca', -2, 13, 46, 'cash'],
    [[{ v: 7, q: 3 }], 'Lenard Montoya', -1, 10, 19, 'cash'],
    [[{ v: 18, q: 1 }, { v: 24, q: 2 }], 'Alex Cruz', -1, 12, 34, 'cash'],
    [[{ v: 5, q: 1 }, { v: 6, q: 1 }], 'Reziah Calayag', -1, 15, 21, 'cash'],
    // Today — a busy shift so the dashboard looks alive.
    [[{ v: 7, q: 2 }], 'Sean Villangca', 0, 8, 42, 'cash'],
    [[{ v: 1, q: 1 }, { v: 23, q: 1 }], 'Alex Cruz', 0, 9, 15, 'cash'],
    [[{ v: 4, q: 1 }, { v: 25, q: 1 }], 'Sean Villangca', 0, 9, 57, 'cash'],
    [[{ v: 13, q: 1 }], 'Reziah Calayag', 0, 10, 23, 'cash'],
    [[{ v: 17, q: 1 }, { v: 24, q: 1 }], 'Alex Cruz', 0, 11, 8, 'cash'],
    [[{ v: 11, q: 2 }, { v: 12, q: 1 }], 'Sean Villangca', 0, 12, 31, 'cash'],
    [[{ v: 3, q: 1 }], 'Lenard Montoya', 0, 13, 12, 'gcash'],
    [[{ v: 9, q: 1 }, { v: 10, q: 1 }], 'Reziah Calayag', 0, 14, 5, 'cash'],
    [[{ v: 21, q: 2 }], 'Sean Villangca', 0, 15, 26, 'cash'],
    [[{ v: 7, q: 1 }, { v: 15, q: 1 }, { v: 23, q: 2 }], 'Alex Cruz', 0, 16, 2, 'cash'],
  ]
  for (const [lines, cashier, dOff, h, mnt, method] of recent) {
    push(lines, cashier, isoAt(dOff, h, mnt), method)
  }

  return rows.sort((a, b) => a.id - b.id)
}

let cachedOrders: OrderRow[] | null = null

export function getDemoOrders(): OrderRow[] {
  if (!cachedOrders) cachedOrders = buildOrders()
  return cachedOrders.map((o) => ({ ...o }))
}

export function getDemoRecentOrders(limit = 50): OrderRow[] {
  return getDemoOrders()
    .sort((a, b) => b.id - a.id)
    .slice(0, limit)
}

/* ------------------------------------------------------------------ */
/* Sales summary + trend — derived from the shared order ledger.       */
/* ------------------------------------------------------------------ */

function inRange(iso: string, from: string, to: string): boolean {
  const day = iso.slice(0, 10)
  return day >= from && day <= to
}

export function getDemoSalesSummary(from?: string, to?: string): SalesSummary {
  const today = dateOnly(0)
  const fromDate = from ?? today
  const toDate = to ?? fromDate
  const completed = getDemoOrders().filter(
    (o) => o.status === 'completed' && inRange(o.created_at, fromDate, toDate)
  )
  const total_revenue = completed.reduce((s, o) => s + o.total, 0)
  const order_count = completed.length
  const cash = completed.filter((o) => o.payment_method === 'cash').reduce((s, o) => s + o.total, 0)
  const gcash = completed.filter((o) => o.payment_method === 'gcash').reduce((s, o) => s + o.total, 0)
  const maya = completed.filter((o) => o.payment_method === 'maya').reduce((s, o) => s + o.total, 0)
  return {
    from_date: fromDate,
    to_date: toDate,
    total_revenue,
    order_count,
    revenue_by_payment_method: { cash, gcash, maya },
    average_order_value: order_count === 0 ? 0 : total_revenue / order_count,
  }
}

export function getDemoSalesTrend(): Array<{ month: number; total: number }> {
  const year = String(new Date().getFullYear())
  const buckets = Array.from({ length: 12 }, (_, month) => ({ month, total: 0 }))
  for (const o of getDemoOrders()) {
    if (o.status !== 'completed') continue
    if (!o.created_at.startsWith(year)) continue
    const m = new Date(o.created_at).getMonth()
    if (m >= 0 && m < 12) buckets[m].total += o.total
  }
  return buckets
}

/* ------------------------------------------------------------------ */
/* Expenses.                                                           */
/* ------------------------------------------------------------------ */

const SEED_EXPENSES: Array<Omit<Expense, 'id' | 'date_incurred'> & { dayOffset: number }> = [
  { description: 'Fresh milk delivery (20 L)', category: 'Ingredients', amount: 1900, expense_type: 'Recurring', frequency: 'Weekly', source: 'Cash on Hand', dayOffset: -1 },
  { description: 'Espresso beans restock (5 kg)', category: 'Ingredients', amount: 4250, expense_type: 'Recurring', frequency: 'Monthly', source: 'Bank Account', dayOffset: -3 },
  { description: 'Paper cups & lids (1,000 pcs)', category: 'Packaging', amount: 3800, expense_type: 'One-Time', frequency: 'One-Time', source: 'GCash', dayOffset: -4 },
  { description: 'Meralco electricity bill', category: 'Utilities', amount: 6420.5, expense_type: 'Recurring', frequency: 'Monthly', source: 'Bank Account', dayOffset: -6 },
  { description: 'Tapioca pearls (10 kg)', category: 'Ingredients', amount: 1200, expense_type: 'Recurring', frequency: 'Monthly', source: 'Cash on Hand', dayOffset: -7 },
  { description: 'Part-time helper wages', category: 'Labor', amount: 3500, expense_type: 'Recurring', frequency: 'Weekly', source: 'Cash on Hand', dayOffset: -8 },
  { description: 'Water bill (MWSS)', category: 'Utilities', amount: 1180, expense_type: 'Recurring', frequency: 'Monthly', source: 'GCash', dayOffset: -10 },
  { description: 'Wintermelon + Okinawa syrups', category: 'Ingredients', amount: 1560, expense_type: 'One-Time', frequency: 'One-Time', source: 'Cash on Hand', dayOffset: -11 },
  { description: 'Stall rent — October', category: 'Rent', amount: 12000, expense_type: 'Recurring', frequency: 'Monthly', source: 'Bank Account', dayOffset: -13 },
  { description: 'Ice delivery (30 bags)', category: 'Ingredients', amount: 900, expense_type: 'Recurring', frequency: 'Weekly', source: 'Cash on Hand', dayOffset: -14 },
  { description: 'Matcha + taro powder', category: 'Ingredients', amount: 2750, expense_type: 'One-Time', frequency: 'One-Time', source: 'GCash', dayOffset: -16 },
  { description: 'Thermal receipt rolls', category: 'Packaging', amount: 640, expense_type: 'One-Time', frequency: 'One-Time', source: 'Cash on Hand', dayOffset: -18 },
  { description: 'Cashier overtime pay', category: 'Labor', amount: 1200, expense_type: 'One-Time', frequency: 'One-Time', source: 'Cash on Hand', dayOffset: -20 },
  { description: 'Wi-Fi (converge) monthly', category: 'Utilities', amount: 1499, expense_type: 'Recurring', frequency: 'Monthly', source: 'Bank Account', dayOffset: -22 },
  { description: 'Nata de coco + chocolate chips', category: 'Ingredients', amount: 1980, expense_type: 'Recurring', frequency: 'Monthly', source: 'Cash on Hand', dayOffset: -24 },
  { description: 'Menu board reprint', category: 'Other', amount: 850, expense_type: 'One-Time', frequency: 'One-Time', source: 'GCash', dayOffset: -27 },
]

export function getDemoExpenses(limit = 100): Expense[] {
  return SEED_EXPENSES.map((e, i) => ({
    id: 300 - i,
    description: e.description,
    category: e.category,
    amount: e.amount,
    expense_type: e.expense_type,
    frequency: e.frequency,
    source: e.source,
    date_incurred: dateOnly(e.dayOffset),
  })).slice(0, limit)
}

/* ------------------------------------------------------------------ */
/* Staff roster.                                                       */
/* ------------------------------------------------------------------ */

export function getDemoProfiles(): StaffProfile[] {
  return [
    { id: 'demo-owner-1', full_name: 'Gian Baldovino', email: 'boss_gian@gmail.com', role: 'owner', is_active: true },
    { id: 'demo-owner-2', full_name: 'Reziah Calayag', email: 'reziah@gmail.com', role: 'owner', is_active: true },
    { id: 'demo-cashier-1', full_name: 'Sean Villangca', email: 'sean@gmail.com', role: 'cashier', is_active: true },
    { id: 'demo-cashier-2', full_name: 'Alex Cruz', email: 'alex.cruz@gmail.com', role: 'cashier', is_active: true },
    { id: 'demo-cashier-3', full_name: 'Lenard Montoya', email: 'leyy@gmail.com', role: 'cashier', is_active: true },
    { id: 'demo-cashier-4', full_name: 'Maria Santos', email: 'maria.santos@gmail.com', role: 'cashier', is_active: true },
  ]
}
