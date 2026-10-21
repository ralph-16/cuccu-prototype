import { CupSoda } from 'lucide-react'
import { PageHeader } from '@/components/owner/page-header'
import { MenuClient } from './menu-client'
import { getIngredients, getMenuWithRecipes } from '@/lib/supabase/queries'

/** Owner menu & recipes — live products, variants, recipe mapping, and stock. */
export default async function MenuRecipesPage() {
  const [menu, ingredients] = await Promise.all([getMenuWithRecipes(), getIngredients()])

  if (menu.error || !menu.data) {
    return (
      <p role="alert" className="rounded-2xl bg-red-50 px-4 py-8 text-center text-sm font-semibold text-red-700">
        {menu.error ?? 'Could not load menu.'}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader icon={<CupSoda className="size-5" aria-hidden="true" />} title="Menu & Recipes" subtitle="Manage your menu items and their recipes." />
      <MenuClient items={menu.data} ingredients={ingredients.data ?? []} />
    </div>
  )
}
