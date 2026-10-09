import { OrderClient } from './order-client'
import { getMenu } from '@/lib/supabase/queries'

/** Cashier POS — live menu (variants), cash-only checkout. */
export default async function OrderPage() {
  const { data, error } = await getMenu()

  if (error || !data) {
    return (
      <p role="alert" className="rounded-2xl bg-red-50 px-4 py-8 text-center text-sm font-semibold text-red-700">
        {error ?? 'Could not load menu.'}
      </p>
    )
  }

  return (
    <OrderClient
      menu={data.map((v) => ({
        id: v.id,
        name: `${v.product_name} · ${v.variant_name}`,
        price: v.price,
        category: v.category_name,
        inStock: v.is_available,
      }))}
    />
  )
}
