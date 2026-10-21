'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSessionRole } from '@/lib/auth/role'
import { isDemoMode } from '@/lib/demo/config'
import { getDemoVariantPrice } from '@/lib/demo/data'
import { toUserError } from '@/lib/supabase/errors'

const secret = process.env.PAYMONGO_SECRET_KEY

const walletSchema = z.object({
  payment_method: z.enum(['gcash', 'maya']),
  items: z
    .array(z.object({ product_variant_id: z.number().int().positive(), quantity: z.number().int().min(1).max(99) }))
    .min(1)
    .max(50),
})

/**
 * Starts a wallet (GCash/Maya) checkout via PayMongo.
 *
 * Creates the order as `pending` (so the inventory-deduction trigger only
 * fires once payment is confirmed) and a PayMongo Checkout Session, then
 * returns the hosted checkout URL the browser should redirect to.
 */
export async function startWalletPayment(input: unknown): Promise<{
  orderId: number | null
  checkoutUrl: string | null
  error: string | null
}> {
  const parsed = walletSchema.safeParse(input)
  if (!parsed.success) return { orderId: null, checkoutUrl: null, error: 'Validation failed.' }
  if (!secret) return { orderId: null, checkoutUrl: null, error: 'PayMongo secret key is not configured.' }

  // Compute the total server-side (never trust the client).
  let subtotal = 0
  const variantIds = parsed.data.items.map((i) => i.product_variant_id)
  let liveSession: { userId: string } | null = null
  let liveSupabase: Awaited<ReturnType<typeof createClient>> | null = null
  let livePriceById: Map<number, number> | null = null
  if (isDemoMode()) {
    for (const i of parsed.data.items) {
      const unit = getDemoVariantPrice(i.product_variant_id)
      if (unit == null) return { orderId: null, checkoutUrl: null, error: 'One or more items are unavailable.' }
      subtotal += unit * i.quantity
    }
  } else {
    const session = await getSessionRole()
    if (!session) return { orderId: null, checkoutUrl: null, error: 'Not authenticated.' }
    liveSession = { userId: session.userId }
    const supabase = await createClient()
    liveSupabase = supabase
    const { data: variants, error: ve } = await supabase
      .from('product_variants')
      .select('id, price')
      .in('id', variantIds)
    if (ve) return { orderId: null, checkoutUrl: null, error: toUserError(ve) }
    const priceById = new Map(((variants ?? []) as Array<{ id: number; price: number | string }>).map((v) => [v.id, Number(v.price)]))
    if (priceById.size !== variantIds.length) return { orderId: null, checkoutUrl: null, error: 'One or more items are unavailable.' }
    livePriceById = priceById
    for (const i of parsed.data.items) subtotal += (priceById.get(i.product_variant_id) ?? 0) * i.quantity
  }

  const total = subtotal

  // Create the order as pending (no inventory deduction yet).
  let orderId: number
  if (isDemoMode()) {
    orderId = 5000 + Math.floor(Date.now() % 100000)
  } else {
    if (!liveSession || !liveSupabase || !livePriceById) {
      return { orderId: null, checkoutUrl: null, error: 'Server error.' }
    }
    const { data: order, error: oe } = await liveSupabase
      .from('orders')
      .insert({
        profile_id: liveSession.userId,
        order_status: 'pending',
        payment_method: parsed.data.payment_method,
        subtotal,
        discount_amount: 0,
        total_amount: total,
      })
      .select('id')
      .single()
    if (oe || !order) return { orderId: null, checkoutUrl: null, error: toUserError(oe ?? new Error('no order')) }
    orderId = (order as { id: number }).id

    const lines = parsed.data.items.map((i) => ({
      order_id: orderId,
      product_variant_id: i.product_variant_id,
      quantity: i.quantity,
      unit_price: livePriceById.get(i.product_variant_id) ?? 0,
      subtotal: (livePriceById.get(i.product_variant_id) ?? 0) * i.quantity,
    }))
    const { error: ie } = await liveSupabase.from('order_items').insert(lines)
    if (ie) return { orderId: null, checkoutUrl: null, error: toUserError(ie) }
  }

  // Build absolute callback URLs from the incoming request.
  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  const origin = `${proto}://${host}`
  const successUrl = `${origin}/pos/order/paymongo-return?order_id=${orderId}&status=success`
  const cancelUrl = `${origin}/pos/order/paymongo-return?order_id=${orderId}&status=cancel`

  const amountCentavos = Math.round(total * 100)
  const pmTypes = parsed.data.payment_method === 'gcash' ? ['gcash'] : ['maya']

  const res = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(secret + ':').toString('base64'),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: [
            {
              currency: 'PHP',
              amount: amountCentavos,
              description: `CuccuPOS order #${orderId}`,
              name: `Order #${orderId}`,
              quantity: 1,
            },
          ],
          payment_method_types: pmTypes,
          success_url: successUrl,
          cancel_url: cancelUrl,
          reference_number: String(orderId),
        },
      },
    }),
  })

  if (!res.ok) {
    const txt = await res.text()
    return { orderId, checkoutUrl: null, error: `PayMongo error (${res.status}): ${txt.slice(0, 200)}` }
  }
  const json = (await res.json()) as { data?: { attributes?: { checkout_url?: string } } }
  const checkoutUrl = json?.data?.attributes?.checkout_url
  if (!checkoutUrl) return { orderId, checkoutUrl: null, error: 'No checkout URL returned by PayMongo.' }
  return { orderId, checkoutUrl, error: null }
}

/** Marks a pending wallet order as completed (fires the inventory-deduction trigger). */
export async function completeWalletOrder(orderId: number): Promise<{ error: string | null }> {
  if (isDemoMode()) {
    // Demo mode never created a real row; the client records it locally.
    return { error: null }
  }
  const session = await getSessionRole()
  if (!session) return { error: 'Not authenticated.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update({ order_status: 'completed' })
    .eq('id', orderId)
    .eq('order_status', 'pending')
  if (error) return { error: toUserError(error) }
  return { error: null }
}

/** Cancels a pending wallet order (e.g. customer aborted on PayMongo). */
export async function cancelWalletOrder(orderId: number): Promise<{ error: string | null }> {
  if (isDemoMode()) return { error: null }
  const session = await getSessionRole()
  if (!session) return { error: 'Not authenticated.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update({ order_status: 'cancelled' })
    .eq('id', orderId)
    .eq('order_status', 'pending')
  if (error) return { error: toUserError(error) }
  return { error: null }
}
