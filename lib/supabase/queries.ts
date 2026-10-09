'use server'

import { createClient } from '@/lib/supabase/server'
import { getSessionRole } from '@/lib/auth/role'
import { toUserError } from '@/lib/supabase/errors'
import { createCashOrderSchema } from '@/lib/validations/order'

export interface MenuVariant {
  id: number
  product_id: number
  product_name: string
  category_name: string
  variant_name: string
  price: number
  is_available: boolean
}

/**
 * Cashier/owner menu: categories + products + variants in one join.
 * RLS SELECT policies (authenticated USING(true)) enforce visibility;
 * no service_role involved.
 */
export async function getMenu(): Promise<{ data: MenuVariant[] | null; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_variants')
    .select(
      'id, product_id, variant_name, price, is_available, products!inner(name, is_available, categories!inner(name))'
    )
    .eq('products.is_available', true)
    .order('id')
    .limit(500)

  if (error) return { data: null, error: toUserError(error) }

  const rows = ((data ?? []) as unknown as Array<{
    id: number
    product_id: number
    variant_name: string
    price: number | string
    is_available: boolean
    products: { name: string; categories: { name: string } }
  }>).map((r) => ({
    id: r.id,
    product_id: r.product_id,
    product_name: r.products.name,
    category_name: r.products.categories.name,
    variant_name: r.variant_name,
    price: Number(r.price),
    is_available: r.is_available,
  }))

  return { data: rows, error: null }
}

/**
 * Creates a cash order + lines, then completes it so the
 * deduct_inventory_for_completed_order() trigger fires.
 * profile_id is always server-set from the JWT user — never client input.
 */
export async function createCashOrder(input: unknown): Promise<{
  orderId: number | null
  total: number | null
  error: string | null
}> {
  const parsed = createCashOrderSchema.safeParse(input)
  if (!parsed.success) {
    return { orderId: null, total: null, error: 'Validation failed.' }
  }

  const session = await getSessionRole()
  if (!session) return { orderId: null, total: null, error: 'Not authenticated.' }

  const supabase = await createClient()

  // Look up current variant prices server-side (never trust client totals).
  const variantIds = parsed.data.items.map((i) => i.product_variant_id)
  const { data: variants, error: variantError } = await supabase
    .from('product_variants')
    .select('id, price')
    .in('id', variantIds)

  if (variantError) return { orderId: null, total: null, error: toUserError(variantError) }
  const priceById = new Map(
    ((variants ?? []) as Array<{ id: number; price: number | string }>).map((v) => [
      v.id,
      Number(v.price),
    ])
  )
  if (priceById.size !== variantIds.length) {
    return { orderId: null, total: null, error: 'One or more items are unavailable.' }
  }

  let subtotal = 0
  const lines = parsed.data.items.map((i) => {
    const unit = priceById.get(i.product_variant_id) ?? 0
    const line = unit * i.quantity
    subtotal += line
    return {
      product_variant_id: i.product_variant_id,
      quantity: i.quantity,
      unit_price: unit,
      subtotal: line,
    }
  })
  const total = Math.max(0, subtotal - parsed.data.discount_amount)

  // 1. Pending order first (trigger only fires on transition to completed,
  //    and only when order_items already exist).
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      profile_id: session.userId,
      order_status: 'pending',
      payment_method: 'cash',
      subtotal,
      discount_amount: parsed.data.discount_amount,
      total_amount: total,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    return { orderId: null, total: null, error: toUserError(orderError ?? new Error('no order')) }
  }

  const orderId = (order as { id: number }).id

  const { error: itemsError } = await supabase.from('order_items').insert(
    lines.map((l) => ({ ...l, order_id: orderId }))
  )
  if (itemsError) return { orderId: null, total: null, error: toUserError(itemsError) }

  // 2. Complete -> inventory trigger deducts via recipes mapping.
  const { error: completeError } = await supabase
    .from('orders')
    .update({ order_status: 'completed' })
    .eq('id', orderId)

  if (completeError) return { orderId, total, error: toUserError(completeError) }
  return { orderId, total, error: null }
}

export interface SalesSummary {
  from_date: string
  to_date: string
  total_revenue: number
  order_count: number
  revenue_by_payment_method: { cash: number; gcash: number; maya: number }
  average_order_value: number
}

/**
 * Owner-only aggregate via SECURITY DEFINER get_sales_summary().
 * The in-function guard (profiles.role='owner') is the real check;
 * the layout/middleware role gate is fast-fail UX only.
 */
export async function getSalesSummary(
  from?: string,
  to?: string
): Promise<{ data: SalesSummary | null; error: string | null }> {
  const session = await getSessionRole()
  if (!session) return { data: null, error: 'Not authenticated.' }
  if (session.role !== 'owner') return { data: null, error: 'Owners only.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_sales_summary', {
    p_from_date: from ?? null,
    p_to_date: to ?? null,
  })

  if (error) return { data: null, error: toUserError(error) }
  const row = (Array.isArray(data) ? data[0] : data) as SalesSummary | undefined
  if (!row) return { data: null, error: 'Report returned no rows.' }
  return {
    data: {
      ...row,
      total_revenue: Number(row.total_revenue),
      average_order_value: Number(row.average_order_value),
      revenue_by_payment_method: {
        cash: Number(row.revenue_by_payment_method?.cash ?? 0),
        gcash: Number(row.revenue_by_payment_method?.gcash ?? 0),
        maya: Number(row.revenue_by_payment_method?.maya ?? 0),
      },
    },
    error: null,
  }
}

export interface Ingredient {
  id: number
  name: string
  unit: string
  stock_quantity: number
  reorder_level: number
  is_available: boolean
}

/** Ingredients ledger — any authenticated role can read (RLS USING(true)). */
export async function getIngredients(): Promise<{ data: Ingredient[] | null; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ingredients')
    .select('id, name, unit, stock_quantity, reorder_level, is_available')
    .order('name')

  if (error) return { data: null, error: toUserError(error) }
  return {
    data: ((data ?? []) as Array<Record<string, number | string | boolean>>).map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      unit: String(r.unit),
      stock_quantity: Number(r.stock_quantity),
      reorder_level: Number(r.reorder_level),
      is_available: Boolean(r.is_available),
    })),
    error: null,
  }
}

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock'

/** Owner restock — appends a stock_in ledger row; trigger updates ingredients. */
export async function recordStockIn(input: {
  ingredient_id: number
  quantity: number
  notes?: string
}): Promise<{ error: string | null }> {
  const session = await getSessionRole()
  if (!session) return { error: 'Not authenticated.' }
  if (session.role !== 'owner') return { error: 'Owners only.' }
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { error: 'Quantity must be greater than zero.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('inventory_transactions').insert({
    ingredient_id: input.ingredient_id,
    transaction_type: 'stock_in',
    quantity: input.quantity,
    reference_type: 'RESTOCK',
    notes: input.notes ?? 'Manual restock',
  })
  if (error) return { error: toUserError(error) }
  return { error: null }
}

export interface OrderRow {
  id: number
  items: number
  cashier: string
  created_at: string
  payment_method: string
  total: number
  status: string
}

/** Recent orders with line counts + cashier name. RLS scopes rows per role. */
export async function getRecentOrders(
  limit = 50
): Promise<{ data: OrderRow[] | null; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, payment_method, total_amount, order_status, created_at, order_items(quantity), profiles(full_name)'
    )
    .order('id', { ascending: false })
    .limit(limit)

  if (error) return { data: null, error: toUserError(error) }
  return {
    data: ((data ?? []) as unknown as Array<{
      id: number
      payment_method: string
      total_amount: number | string
      order_status: string
      created_at: string
      order_items: Array<{ quantity: number }>
      profiles: { full_name: string } | null
    }>).map((o) => ({
      id: o.id,
      items: o.order_items.reduce((s, l) => s + (l.quantity ?? 0), 0),
      cashier: o.profiles?.full_name ?? '—',
      created_at: o.created_at,
      payment_method: o.payment_method,
      total: Number(o.total_amount),
      status: o.order_status,
    })),
    error: null,
  }
}

/** Completed-order totals for the annual trend chart (prototype scale). */
export async function getSalesTrend(): Promise<{ data: Array<{ month: number; total: number }> | null; error: string | null }> {
  const supabase = await createClient()
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1).toISOString()
  const { data, error } = await supabase
    .from('orders')
    .select('total_amount, created_at')
    .eq('order_status', 'completed')
    .gte('created_at', start)
    .limit(2000)

  if (error) return { data: null, error: toUserError(error) }
  const buckets = Array.from({ length: 12 }, (_, month) => ({ month, total: 0 }))
  for (const r of (data ?? []) as Array<{ total_amount: number | string; created_at: string }>) {
    const m = new Date(r.created_at).getMonth()
    if (m >= 0 && m < 12) buckets[m].total += Number(r.total_amount)
  }
  return { data: buckets, error: null }
}

export interface StaffProfile {
  id: string
  full_name: string
  role: 'owner' | 'cashier'
  is_active: boolean
}

/** Owner-only roster (RLS "Owners can manage all profiles" enforces). Active staff only. */
export async function getProfiles(): Promise<{ data: StaffProfile[] | null; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active')
    .eq('is_active', true)
    .order('full_name')
  if (error) return { data: null, error: toUserError(error) }
  return { data: (data ?? []) as StaffProfile[], error: null }
}

/** Owner changes a staff member's role. */
export async function updateProfileRole(
  id: string,
  role: 'owner' | 'cashier'
): Promise<{ error: string | null }> {
  return updateStaffProfile(id, { role })
}

/** Owner edits a staff profile (name and/or role). Email lives in Auth and can't change here. */
export async function updateStaffProfile(
  id: string,
  input: { full_name?: string; role?: 'owner' | 'cashier' }
): Promise<{ error: string | null }> {
  const session = await getSessionRole()
  if (!session) return { error: 'Not authenticated.' }
  if (session.role !== 'owner') return { error: 'Owners only.' }

  const patch: { full_name?: string; role?: 'owner' | 'cashier' } = {}
  if (input.full_name !== undefined) {
    const name = input.full_name.trim()
    if (!name) return { error: 'Name cannot be empty.' }
    patch.full_name = name
  }
  if (input.role !== undefined) {
    if (input.role !== 'owner' && input.role !== 'cashier') return { error: 'Invalid role.' }
    patch.role = input.role
  }
  if (Object.keys(patch).length === 0) return { error: 'Nothing to update.' }

  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update(patch).eq('id', id)
  if (error) return { error: toUserError(error) }
  return { error: null }
}

/**
 * Owner deactivates staff (soft delete). The login stays in Auth but resolves
 * to no role anywhere: RLS denies all rows (get_user_role() → NULL) and the
 * app bounces every route to /login. History keeps the name. Reversible:
 *   update public.profiles set is_active = true where id = '…';
 */
export async function deactivateStaffProfile(id: string): Promise<{ error: string | null }> {
  const session = await getSessionRole()
  if (!session) return { error: 'Not authenticated.' }
  if (session.role !== 'owner') return { error: 'Owners only.' }
  if (id === session.userId) return { error: 'You cannot remove your own account.' }

  const supabase = await createClient()
  const { data: target, error: targetError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', id)
    .single()
  if (targetError || !target) return { error: 'Staff member not found.' }

  // Never strand the project with zero active owners.
  if ((target as { role: string }).role === 'owner') {
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'owner')
      .eq('is_active', true)
    if (countError) return { error: toUserError(countError) }
    if ((count ?? 0) <= 1) {
      return { error: 'Cannot remove the last active owner.' }
    }
  }

  const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', id)
  if (error) return { error: toUserError(error) }
  return { error: null }
}
/**
 * Owner adds staff: creates the Auth user (auto-creates a cashier profile
 * via handle_new_user), then promotes to the chosen role.
 * Note: if the project requires email confirmation, the new user must
 * confirm before first login.
 */
export async function addStaff(input: {
  email: string
  password: string
  full_name: string
  role: 'owner' | 'cashier'
}): Promise<{ error: string | null }> {
  const session = await getSessionRole()
  if (!session) return { error: 'Not authenticated.' }
  if (session.role !== 'owner') return { error: 'Owners only.' }
  if (!input.email.includes('@') || input.password.length < 6 || !input.full_name.trim()) {
    return { error: 'Enter a valid email, 6+ char password, and name.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: { data: { full_name: input.full_name.trim(), role: input.role } },
  })
  if (error) return { error: error.message }
  if (!data.user) return { error: 'Could not create user.' }

  // handle_new_user trigger creates the profile; set the intended role.
  const { error: roleError } = await supabase
    .from('profiles')
    .update({ role: input.role, full_name: input.full_name.trim() })
    .eq('id', data.user.id)
  if (roleError) return { error: toUserError(roleError) }
  return { error: null }
}

export interface Expense {
  id: number
  description: string
  category: string
  amount: number
  expense_type: string
  frequency: string
  source: string
  date_incurred: string
}

export async function getExpenses(
  limit = 100
): Promise<{ data: Expense[] | null; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('id, description, category, amount, expense_type, frequency, source, date_incurred')
    .order('date_incurred', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)

  if (error) return { data: null, error: toUserError(error) }
  return {
    data: ((data ?? []) as Array<Record<string, number | string>>).map((r) => ({
      id: Number(r.id),
      description: String(r.description),
      category: String(r.category),
      amount: Number(r.amount),
      expense_type: String(r.expense_type),
      frequency: String(r.frequency),
      source: String(r.source),
      date_incurred: String(r.date_incurred),
    })),
    error: null,
  }
}

export async function addExpense(input: {
  description: string
  category: string
  amount: number
  expense_type: string
  frequency: string
  source: string
  date_incurred: string
  notes?: string
}): Promise<{ error: string | null }> {
  const session = await getSessionRole()
  if (!session) return { error: 'Not authenticated.' }
  if (session.role !== 'owner') return { error: 'Owners only.' }
  if (!input.description.trim() || !Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: 'Enter a description and an amount greater than zero.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('expenses').insert({
    profile_id: session.userId,
    description: input.description.trim(),
    category: input.category,
    amount: input.amount,
    expense_type: input.expense_type,
    frequency: input.frequency,
    source: input.source,
    date_incurred: input.date_incurred,
    notes: input.notes?.trim() || null,
  })
  if (error) return { error: toUserError(error) }
  return { error: null }
}

export interface MenuProduct {
  id: number
  name: string
  description: string | null
  category_name: string
  is_available: boolean
  variants: Array<{ id: number; variant_name: string; price: number; is_available: boolean }>
  recipe: Array<{ ingredient: string; quantity: number; unit: string }>
}

/** Full menu + recipes for the owner Menu & Recipes page. */
export async function getMenuWithRecipes(): Promise<{
  data: MenuProduct[] | null
  error: string | null
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, name, description, is_available, categories!inner(name), product_variants(id, variant_name, price, is_available, recipes(quantity, ingredients!inner(name, unit)))'
    )
    .order('name')
    .limit(200)

  if (error) return { data: null, error: toUserError(error) }
  return {
    data: ((data ?? []) as unknown as Array<{
      id: number
      name: string
      description: string | null
      is_available: boolean
      categories: { name: string }
      product_variants: Array<{
        id: number
        variant_name: string
        price: number | string
        is_available: boolean
        recipes: Array<{ quantity: number | string; ingredients: { name: string; unit: string } }>
      }>
    }>).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category_name: p.categories.name,
      is_available: p.is_available,
      variants: p.product_variants.map((v) => ({
        id: v.id,
        variant_name: v.variant_name,
        price: Number(v.price),
        is_available: v.is_available,
      })),
      recipe: p.product_variants.flatMap((v) =>
        v.recipes.map((r) => ({
          ingredient: r.ingredients.name,
          quantity: Number(r.quantity),
          unit: r.ingredients.unit,
        }))
      ),
    })),
    error: null,
  }
}
