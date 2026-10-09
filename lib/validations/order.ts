import { z } from 'zod'

/**
 * Cash-only order validation (PayMongo skipped).
 * Mirrors the DB CHECKs in CUCCU_POS_Master_Organized.sql so bad input
 * fails fast in the Server Action with a 400-style message instead of a
 * raw Postgres error. RLS remains the real authorization boundary.
 */

export const orderLineSchema = z.object({
  product_variant_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99),
})

export const createCashOrderSchema = z.object({
  // Cash-only while PayMongo is skipped; DB still allows gcash/maya later.
  payment_method: z.literal('cash'),
  discount_amount: z.number().min(0).max(100000).default(0),
  items: z.array(orderLineSchema).min(1).max(50),
})

export type CreateCashOrderInput = z.infer<typeof createCashOrderSchema>

export const salesSummaryQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD')
    .optional(),
})
