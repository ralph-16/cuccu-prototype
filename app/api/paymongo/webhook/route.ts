import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const TOLERANCE_SECONDS = 5 * 60

function parseSignature(header: string | null) {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(',')) {
    const idx = part.indexOf('=')
    if (idx < 0) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (key) out[key] = value
  }
  return out
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}

type PayMongoWebhookPayload = {
  data?: {
    attributes?: {
      type?: unknown
      data?: {
        attributes?: { reference_number?: unknown; metadata?: { order_id?: unknown } }
        reference_number?: unknown
        metadata?: { order_id?: unknown }
      }
      reference_number?: unknown
      metadata?: { order_id?: unknown }
    }
  }
  type?: unknown
}

function extractEventType(payload: unknown): string {
  const p = payload as PayMongoWebhookPayload
  return String(p?.data?.attributes?.type ?? p?.type ?? '').toLowerCase()
}

function extractOrderId(payload: unknown): number {
  const p = payload as PayMongoWebhookPayload
  const attrs = p?.data?.attributes
  const candidates = [
    attrs?.data?.attributes?.reference_number,
    attrs?.data?.reference_number,
    attrs?.reference_number,
    attrs?.data?.attributes?.metadata?.order_id,
    attrs?.metadata?.order_id,
  ]
  for (const c of candidates) {
    const n = Number(c)
    if (Number.isFinite(n) && n > 0) return n
  }
  return NaN
}

export async function POST(request: Request) {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 })
  }

  const rawBody = await request.text()
  const sigHeader = request.headers.get('paymongo-signature') || request.headers.get('Paymongo-Signature')
  const sig = parseSignature(sigHeader)

  const timestamp = sig.t
  if (!timestamp) {
    return NextResponse.json({ error: 'Missing timestamp.' }, { status: 401 })
  }
  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) {
    return NextResponse.json({ error: 'Invalid timestamp.' }, { status: 401 })
  }
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > TOLERANCE_SECONDS) {
    return NextResponse.json({ error: 'Timestamp outside tolerance.' }, { status: 401 })
  }

  const signedPayload = `${timestamp}.${rawBody}`
  const computed = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')

  const provided = [sig.te, sig.li].filter(Boolean) as string[]
  if (provided.length === 0 || !provided.some((s) => safeEqual(computed, s))) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const eventType = extractEventType(payload)
  const orderId = extractOrderId(payload)

  // Acknowledge unknown/unmapped events without retry storms.
  if (!Number.isFinite(orderId)) {
    return NextResponse.json({ received: true, ignored: 'no_order_id', eventType }, { status: 200 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    // No backend configured (demo/no-service-role). Acknowledge so PayMongo
    // stops retrying; the redirect flow still completes orders in demo mode.
    return NextResponse.json({ received: true, ignored: 'no_admin_client', eventType }, { status: 200 })
  }

  const isPaid = eventType.includes('paid') || eventType.includes('succeeded') || eventType.includes('completed')
  const isFailed = eventType.includes('failed') || eventType.includes('expired') || eventType.includes('cancelled') || eventType.includes('canceled')

  if (isPaid) {
    await supabase
      .from('orders')
      .update({ order_status: 'completed' })
      .eq('id', orderId)
      .eq('order_status', 'pending')
  } else if (isFailed) {
    await supabase
      .from('orders')
      .update({ order_status: 'cancelled' })
      .eq('id', orderId)
      .eq('order_status', 'pending')
  }

  return NextResponse.json({ received: true, eventType, orderId }, { status: 200 })
}