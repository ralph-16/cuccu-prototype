import { CupSoda } from 'lucide-react'
import { PageHeader } from '@/components/owner/page-header'
import { MenuClient } from './menu-client'
import { getMenuWithRecipes } from '@/lib/supabase/queries'

/** Owner menu & recipes — live products, variants, and recipe mapping. */
export default async function MenuRecipesPage() {
  const { data, error } = await getMenuWithRecipes()

  if (error || !data) {
    return (
      <p role="alert" className="rounded-2xl bg-red-50 px-4 py-8 text-center text-sm font-semibold text-red-700">
        {error ?? 'Could not load menu.'}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader icon={<CupSoda className="size-5" aria-hidden="true" />} title="Menu & Recipes" subtitle="Manage your menu items and their recipes." />
      <MenuClient items={data} />
    </div>
  )
}
