import { CupSoda } from 'lucide-react'
import { CashierPageHeader } from '@/components/cashier/page-header'
import { OrderClient } from './order-client'
import { getMenu } from '@/lib/supabase/queries'

/** Cashier POS — live menu (variants), cash-only checkout. */
export default async function OrderPage() {
  const { data, error } = await getMenu()

  if (error || !data) {
    return (
      <div className="flex flex-col gap-4">
        <CashierPageHeader
          icon={<CupSoda className="size-5" aria-hidden="true" />}
          title="Order"
          subtitle="Take a customer order. Cash only."
        />
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-8 text-center text-sm font-semibold text-red-700">
          {error ?? 'Could not load menu.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <CashierPageHeader
        icon={<CupSoda className="size-5" aria-hidden="true" />}
        title="Order"
        subtitle="Take a customer order. Cash only."
      />
      <OrderClient
        menu={data.map((v) => ({
          id: v.id,
          name: `${v.product_name} · ${v.variant_name}`,
          price: v.price,
          category: v.category_name,
          inStock: v.is_available,
        }))}
      />
    </div>
  )
}
