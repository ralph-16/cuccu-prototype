import { Package } from 'lucide-react'
import { CashierPageHeader } from '@/components/cashier/page-header'
import { InventoryTable } from './inventory-table'
import { getIngredients } from '@/lib/supabase/queries'
import { stockStatus } from '@/lib/supabase/stock'

/** Cashier read-only stock view — live ingredients, computed availability. */
export default async function CashierInventoryPage() {
  const { data, error } = await getIngredients()

  if (error || !data) {
    return (
      <div className="flex flex-col gap-4">
        <CashierPageHeader
          icon={<Package className="size-5" aria-hidden="true" />}
          title="Inventory"
          subtitle="Check what's available before taking orders. Read-only."
        />
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-8 text-center text-sm font-semibold text-red-700">
          {error ?? 'Could not load inventory.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <CashierPageHeader
        icon={<Package className="size-5" aria-hidden="true" />}
        title="Inventory"
        subtitle="Check what's available before taking orders. Read-only."
      />
      <InventoryTable
        rows={data.map((i) => ({
          id: i.id,
          name: i.name,
          stock: i.stock_quantity,
          unit: i.unit,
          status: stockStatus(i),
        }))}
      />
    </div>
  )
}
