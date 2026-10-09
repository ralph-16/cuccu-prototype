import { Package } from 'lucide-react'
import { PageHeader } from '@/components/owner/page-header'
import { InventoryClient } from './inventory-client'
import { getIngredients } from '@/lib/supabase/queries'

/** Owner inventory — live ledger with restock entries. */
export default async function InventoryPage() {
  const { data, error } = await getIngredients()

  if (error || !data) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          icon={<Package className="size-5" aria-hidden="true" />}
          title="Inventory"
          subtitle="Track your stock levels and manage your supplies."
        />
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-8 text-center text-sm font-semibold text-red-700">
          {error ?? 'Could not load inventory.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        icon={<Package className="size-5" aria-hidden="true" />}
        title="Inventory"
        subtitle="Track your stock levels and manage your supplies."
      />
      <InventoryClient initial={data} />
    </div>
  )
}
