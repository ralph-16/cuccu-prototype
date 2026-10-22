'use client'

import { useMemo, useRef, useState } from 'react'
import {
  CupSoda,
  FileText,
  ImagePlus,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { Panel, StockBadge } from '@/components/owner/widgets'
import { peso } from '@/lib/mock-data'
import type { Ingredient, MenuProduct } from '@/lib/supabase/queries'
import { stockStatus } from '@/lib/supabase/stock'
import { addDemoMenu, isDemoModeClient, mergeDemoMenu } from '@/lib/demo/client-store'
import { cn } from '@/lib/utils'

const FALLBACK_CATEGORIES = ['Coffee', 'Milk Tea', 'Frappe', 'Others']

function priceRange(p: MenuProduct) {
  if (p.variants.length === 0) return '—'
  const prices = p.variants.map((v) => v.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max ? peso(min) : `${peso(min)} – ${peso(max)}`
}

function Thumb({
  item,
  className,
  iconClass = 'size-10',
}: {
  item: MenuProduct
  className?: string
  iconClass?: string
}) {
  if (item.image) {
    return (
      <span
        role="img"
        aria-label={item.name}
        className={cn('block bg-cover bg-center', className)}
        style={{ backgroundImage: `url(${item.image})` }}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid place-items-center bg-gradient-to-br from-olive-200 via-cream-200 to-olive-300 text-olive-700',
        className
      )}
    >
      <CupSoda className={iconClass} />
    </span>
  )
}

function MenuCard({
  item,
  active,
  onSelect,
  onMore,
}: {
  item: MenuProduct
  active: boolean
  onSelect: () => void
  onMore: () => void
}) {
  return (
    <article
      className={cn(
        'relative rounded-2xl border border-olive-900/10 bg-white p-3 shadow-[0_2px_8px_rgba(46,51,29,0.06)] transition',
        active ? 'ring-2 ring-olive-600' : 'hover:shadow-[0_4px_14px_rgba(46,51,29,0.12)]'
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        aria-label={`Select ${item.name}`}
        className="flex w-full gap-3 text-left focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
      >
        <Thumb item={item} className="h-[92px] w-[92px] shrink-0 rounded-xl" />
        <span className="flex min-w-0 flex-1 flex-col pr-7">
          <span className="truncate text-[15px] font-bold text-olive-950">{item.name}</span>
          <span className="text-sm font-bold text-olive-800 tabular-nums">{priceRange(item)}</span>
          <span className="mt-0.5 line-clamp-2 text-xs text-stone-500">{item.description ?? '—'}</span>
          <span className="mt-auto flex items-center pt-1.5">
            <span className="rounded-full bg-olive-100 px-2.5 py-0.5 text-[11px] font-semibold text-olive-800">
              {item.category_name}
            </span>
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onMore}
        aria-label={`View ${item.name} details`}
        className="absolute right-2.5 bottom-2.5 grid size-8 cursor-pointer place-items-center rounded-lg text-stone-400 transition-colors hover:bg-cream-100 hover:text-olive-800 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </button>
    </article>
  )
}

function InfoCell({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-cream-50 text-olive-700 ring-1 ring-olive-900/10">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-stone-400">{label}</p>
        <p className="truncate text-sm font-semibold text-olive-950">{children}</p>
      </div>
    </div>
  )
}

function ItemDetailModal({
  item,
  onClose,
  onEdit,
}: {
  item: MenuProduct
  onClose: () => void
  onEdit: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${item.name} details`}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-olive-950/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative my-auto w-full max-w-4xl rounded-3xl bg-cream-50 p-5 shadow-[0_20px_60px_rgba(20,24,12,0.35)] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          autoFocus
          className="absolute top-4 right-4 grid size-9 cursor-pointer place-items-center rounded-full bg-cream-100 text-stone-500 transition-colors hover:bg-cream-200 hover:text-olive-900 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <Thumb item={item} className="aspect-square w-full rounded-2xl" iconClass="size-24" />

          <div className="flex flex-col">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-olive-800 px-3.5 py-1 text-sm font-semibold text-cream-50">
              <CupSoda className="size-4" aria-hidden="true" /> {item.category_name}
            </span>
            <h2 className="mt-3 text-3xl leading-tight font-bold text-olive-950 sm:text-4xl">{item.name}</h2>
            <p className="mt-1 text-3xl font-bold text-olive-700 tabular-nums sm:text-4xl">{priceRange(item)}</p>

            <p className="mt-4 border-t border-olive-900/15 pt-4 text-[15px] leading-relaxed text-stone-600">
              {item.description ?? 'No description yet.'}
            </p>

            <dl className="mt-5 grid grid-cols-1 gap-3 rounded-2xl border border-olive-900/15 bg-cream-100 py-3 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-olive-900/15">
              <InfoCell icon={<CupSoda className="size-4" aria-hidden="true" />} label="Category">
                {item.category_name}
              </InfoCell>
              <InfoCell icon={<Tag className="size-4" aria-hidden="true" />} label="Price">
                {priceRange(item)}
              </InfoCell>
              <InfoCell icon={<Package className="size-4" aria-hidden="true" />} label="Availability">
                {item.is_available ? (
                  <span className="inline-flex rounded-full bg-olive-200/80 px-2.5 py-0.5 text-xs font-semibold text-olive-900">
                    in stock
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                    out of stock
                  </span>
                )}
              </InfoCell>
            </dl>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-olive-800 font-bold text-olive-900 transition-colors hover:bg-olive-100 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
              >
                <Pencil className="size-4" aria-hidden="true" /> Edit
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-olive-800 font-bold text-cream-50 transition-colors hover:bg-olive-900 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <X className="size-4" aria-hidden="true" /> close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RecipePanel({
  item,
  ingredients,
  tab,
  onTab,
}: {
  item: MenuProduct | null
  ingredients: Ingredient[]
  tab: 'recipe' | 'ingredients'
  onTab: (t: 'recipe' | 'ingredients') => void
}) {
  const byName = useMemo(() => new Map(ingredients.map((i) => [i.name, i])), [ingredients])

  return (
    <section className="relative mt-5 rounded-2xl border border-olive-900/12 bg-cream-50 p-4 pt-7 shadow-[0_2px_10px_rgba(46,51,29,0.08)]">
      <div className="absolute -top-3.5 left-4 flex gap-2" role="tablist" aria-label="Recipe information">
        <button
          role="tab"
          aria-selected={tab === 'recipe'}
          onClick={() => onTab('recipe')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none',
            tab === 'recipe' ? 'bg-olive-900 text-cream-50' : 'bg-cream-200 text-olive-900 hover:bg-olive-100'
          )}
        >
          <FileText className="size-3.5" aria-hidden="true" /> Recipe
        </button>
        <button
          role="tab"
          aria-selected={tab === 'ingredients'}
          onClick={() => onTab('ingredients')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none',
            tab === 'ingredients' ? 'bg-olive-900 text-cream-50' : 'bg-cream-200 text-olive-900 hover:bg-olive-100'
          )}
        >
          <Package className="size-3.5" aria-hidden="true" /> Ingredients
        </button>
      </div>

      {!item ? (
        <p className="py-6 text-center text-sm text-stone-500">Select a menu item to see its recipe.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="flex items-center gap-3">
            <Thumb item={item} className="size-20 shrink-0 rounded-xl" iconClass="size-8" />
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold text-olive-950">{item.name}</h3>
              <p className="mt-0.5 text-xs text-stone-500">
                Category: <span className="font-semibold text-olive-800">{item.category_name}</span> | Price:{' '}
                <span className="font-semibold text-olive-800 tabular-nums">{priceRange(item)}</span>
              </p>
            </div>
          </div>

          {tab === 'recipe' ? (
            <div>
              <h3 className="text-sm font-bold text-olive-950">Recipe Details</h3>
              {item.recipe.length === 0 ? (
                <p className="mt-2 text-sm text-stone-500">No recipe mapped yet.</p>
              ) : (
                <ol className="mt-2 space-y-1 rounded-xl bg-olive-100/70 p-3 text-sm">
                  {item.recipe.map((r, i) => (
                    <li
                      key={`${r.ingredient}-${i}`}
                      className="flex items-center justify-between gap-2 border-b border-dashed border-olive-900/10 pb-1 last:border-0 last:pb-0"
                    >
                      <span className="text-olive-950">
                        {i + 1}. {r.ingredient}
                      </span>
                      <span className="shrink-0 font-semibold text-olive-700 tabular-nums">
                        − {r.quantity} {r.unit}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-bold text-olive-950">Ingredient Stock</h3>
              {item.recipe.length === 0 ? (
                <p className="mt-2 text-sm text-stone-500">No ingredients mapped yet.</p>
              ) : (
                <ol className="mt-2 space-y-1 rounded-xl bg-olive-100/70 p-3 text-sm">
                  {item.recipe.map((r, i) => {
                    const ing = byName.get(r.ingredient)
                    return (
                      <li
                        key={`${r.ingredient}-${i}`}
                        className="flex items-center justify-between gap-2 border-b border-dashed border-olive-900/10 pb-1 last:border-0 last:pb-0"
                      >
                        <span className="text-olive-950">{r.ingredient}</span>
                        {ing ? (
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="font-semibold text-olive-700 tabular-nums">
                              {ing.stock_quantity} {ing.unit}
                            </span>
                            <StockBadge status={stockStatus(ing)} />
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400">not tracked</span>
                        )}
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
          )}

          <div>
            <h3 className="text-sm font-bold text-olive-950">Preparation Method</h3>
            {item.preparation && item.preparation.length > 0 ? (
              <ol className="mt-2 space-y-1 text-sm text-olive-950">
                {item.preparation.map((step, i) => (
                  <li key={i}>
                    {i + 1}. {step}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-stone-500">No preparation steps recorded yet.</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

interface DraftRow {
  ingredient: string
  quantity: string
  unit: string
}

const emptyDraft: DraftRow = { ingredient: '', quantity: '', unit: '' }

function AddMenuModal({
  mode,
  initial,
  categories,
  ingredients,
  onClose,
  onSave,
}: {
  mode: 'add' | 'edit'
  initial?: MenuProduct
  categories: string[]
  ingredients: Ingredient[]
  onClose: () => void
  onSave: (item: MenuProduct) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState(initial?.category_name ?? categories[0] ?? FALLBACK_CATEGORIES[0])
  const [price, setPrice] = useState(initial ? String(initial.variants[0]?.price ?? '') : '')
  const [image, setImage] = useState<string | null>(initial?.image ?? null)
  const [rows, setRows] = useState<DraftRow[]>(
    (initial?.recipe ?? []).map((r) => ({ ingredient: r.ingredient, quantity: String(r.quantity), unit: r.unit }))
  )
  const [draft, setDraft] = useState<DraftRow>(emptyDraft)
  const [prep, setPrep] = useState((initial?.preparation ?? []).join('\n'))
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function pickImage(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setImage(String(reader.result))
    reader.readAsDataURL(file)
  }

  function addRow() {
    if (!draft.ingredient) {
      setError('Pick an ingredient to add to the recipe.')
      return
    }
    setRows((r) => [...r, draft])
    setDraft(emptyDraft)
    setError(null)
  }

  function save() {
    const trimmed = name.trim()
    const priceNum = Number(price)
    if (!trimmed) {
      setError('Item name is required.')
      return
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError('Enter a price greater than zero.')
      return
    }
    const baseId = initial?.id ?? -Date.now()
    const variants =
      initial && initial.variants.length > 0
        ? initial.variants.map((v, i) => (i === 0 ? { ...v, price: priceNum } : v))
        : [{ id: baseId - 1, variant_name: 'Regular', price: priceNum, is_available: true }]
    onSave({
      id: baseId,
      name: trimmed,
      description: description.trim() || null,
      category_name: category,
      is_available: initial?.is_available ?? true,
      image,
      preparation: prep
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      variants,
      recipe: rows.map((r) => ({
        ingredient: r.ingredient,
        quantity: Number(r.quantity) || 0,
        unit: r.unit.trim() || 'pcs',
      })),
    })
  }

  const inputClass =
    'h-11 w-full rounded-xl border border-olive-900/20 bg-white px-3 text-sm text-olive-950 focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'add' ? 'Add Menu Item' : `Edit ${initial?.name ?? 'item'}`}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-olive-950/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative my-auto w-full max-w-3xl rounded-3xl bg-cream-50 p-6 shadow-[0_20px_60px_rgba(20,24,12,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 grid size-9 cursor-pointer place-items-center rounded-full bg-cream-100 text-stone-500 transition-colors hover:bg-cream-200 hover:text-olive-900 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <h2 className="flex items-center gap-2.5 text-2xl font-bold text-olive-950">
          <span className="grid size-8 place-items-center rounded-full bg-olive-100 text-olive-800">
            <Plus className="size-5" aria-hidden="true" />
          </span>
          {mode === 'add' ? 'Add Menu Item' : 'Edit Menu Item'}
        </h2>
        <div className="mt-4 border-t border-olive-900/15" />

        <div className="mt-4 grid gap-5 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="mi-name" className="mb-1 block text-[13px] font-semibold text-olive-950">
                Item Name
              </label>
              <input
                id="mi-name"
                type="text"
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError(null)
                }}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="mi-desc" className="mb-1 block text-[13px] font-semibold text-olive-950">
                Description
              </label>
              <textarea
                id="mi-desc"
                rows={4}
                value={description ?? ''}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-olive-900/20 bg-white px-3 py-2 text-sm text-olive-950 focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="mi-cat" className="mb-1 block text-[13px] font-semibold text-olive-950">
                  Category
                </label>
                <select
                  id="mi-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={cn(inputClass, 'cursor-pointer')}
                >
                  {(categories.length > 0 ? categories : FALLBACK_CATEGORIES).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="mi-price" className="mb-1 block text-[13px] font-semibold text-olive-950">
                  Price (₱)
                </label>
                <input
                  id="mi-price"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value)
                    setError(null)
                  }}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div>
            <span className="mb-1 block text-[13px] font-semibold text-olive-950">Add Image</span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="grid aspect-square w-full cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed border-olive-900/30 bg-cream-100 text-olive-700 transition-colors hover:bg-cream-200 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
              aria-label="Add item image"
            >
              {image ? (
                <span
                  className="block h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${image})` }}
                  role="img"
                  aria-label="Selected image preview"
                />
              ) : (
                <ImagePlus className="size-10" aria-hidden="true" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => pickImage(e.target.files?.[0])}
            />
            {image ? (
              <button
                type="button"
                onClick={() => setImage(null)}
                className="mt-2 text-xs font-semibold text-red-700 underline-offset-2 hover:underline"
              >
                Remove image
              </button>
            ) : null}
          </div>
        </div>

        <h3 className="mt-6 text-lg font-bold text-olive-950">Recipe Details</h3>
        <div className="mt-2 overflow-hidden rounded-xl border border-olive-900/15">
          <table className="w-full border-collapse bg-white text-left text-sm">
            <thead>
              <tr className="bg-cream-100 text-olive-900">
                <th scope="col" className="px-4 py-2.5 font-semibold">Ingredients</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Quantity &amp; Unit</th>
                <th scope="col" className="px-4 py-2.5 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-olive-900/10">
              {rows.map((r, i) => (
                <tr key={`${r.ingredient}-${i}`}>
                  <td className="px-4 py-2.5 font-semibold text-olive-950">{r.ingredient}</td>
                  <td className="px-4 py-2.5 tabular-nums text-olive-900">
                    {r.quantity} {r.unit}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-cream-50">
                <td className="px-4 py-2.5">
                  <label className="sr-only" htmlFor="mi-ing">Ingredient</label>
                  <select
                    id="mi-ing"
                    value={draft.ingredient}
                    onChange={(e) => setDraft((d) => ({ ...d, ingredient: e.target.value }))}
                    className="h-9 w-full cursor-pointer rounded-lg border border-olive-900/20 bg-white px-2 text-sm focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
                  >
                    <option value="">Select Ingredients</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.name}>
                        {ing.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Quantity"
                      aria-label="Quantity"
                      value={draft.quantity}
                      onChange={(e) => setDraft((d) => ({ ...d, quantity: e.target.value }))}
                      className="h-9 w-24 rounded-lg border border-olive-900/20 bg-white px-2 text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Unit"
                      aria-label="Unit"
                      value={draft.unit}
                      onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
                      className="h-9 w-20 rounded-lg border border-olive-900/20 bg-white px-2 text-sm focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
                    />
                  </div>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <button
                    type="button"
                    onClick={addRow}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-olive-800 px-4 py-1.5 text-xs font-bold text-cream-50 transition-colors hover:bg-olive-900 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <Plus className="size-3.5" aria-hidden="true" /> Add
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="mt-6 text-lg font-bold text-olive-950">Preparation Method</h3>
        <textarea
          rows={3}
          value={prep}
          onChange={(e) => setPrep(e.target.value)}
          placeholder="One step per line…"
          aria-label="Preparation method"
          className="mt-2 w-full rounded-xl border border-olive-900/20 bg-white px-3 py-2 text-sm text-olive-950 focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
        />

        {error ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 min-w-36 cursor-pointer rounded-xl border border-olive-800 px-6 font-bold text-olive-900 transition-colors hover:bg-olive-100 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="h-11 min-w-36 cursor-pointer rounded-xl bg-olive-800 px-6 font-bold text-cream-50 transition-colors hover:bg-olive-900 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {mode === 'add' ? 'Add Menu' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function MenuClient({ items, ingredients }: { items: MenuProduct[]; ingredients: Ingredient[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [rows, setRows] = useState<MenuProduct[]>(() =>
    isDemoModeClient() ? mergeDemoMenu(items) : items
  )
  const [selectedId, setSelectedId] = useState<number | null>(items[0]?.id ?? null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [addMode, setAddMode] = useState<'add' | 'edit' | null>(null)
  const [recipeTab, setRecipeTab] = useState<'recipe' | 'ingredients'>('recipe')
  const [notice, setNotice] = useState<string | null>(null)

  const categories = useMemo(
    () => Array.from(new Set(rows.map((m) => m.category_name))),
    [rows]
  )

  const filtered = useMemo(
    () =>
      rows.filter(
        (m) =>
          (category === 'All' || m.category_name === category) &&
          m.name.toLowerCase().includes(query.toLowerCase())
      ),
    [rows, query, category]
  )

  const selected = rows.find((m) => m.id === selectedId) ?? filtered[0] ?? null
  const detailItem = detailId != null ? rows.find((m) => m.id === detailId) ?? null : null
  const editing = addMode === 'edit' ? detailItem ?? selected : null

  function handleSave(item: MenuProduct) {
    setRows((rs) => {
      const next = rs.some((m) => m.id === item.id)
        ? rs.map((m) => (m.id === item.id ? item : m))
        : [item, ...rs]
      return next
    })
    if (isDemoModeClient()) addDemoMenu(item)
    setSelectedId(item.id)
    setAddMode(null)
    setDetailId(null)
    setNotice(
      `${item.name} ${addMode === 'edit' ? 'updated' : 'added'}${
        isDemoModeClient() ? ' (demo — local only)' : ''
      }.`
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {notice ? (
        <p role="status" className="rounded-2xl bg-olive-100 px-4 py-2.5 text-sm font-semibold text-olive-800">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menu items…"
            aria-label="Search menu items"
            className="h-10 w-full rounded-xl border border-olive-900/20 bg-white pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
          {['All', ...categories].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={cn(
                'h-8 cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none',
                category === c
                  ? 'border-olive-950 bg-olive-950 text-cream-50'
                  : 'border-olive-900/25 bg-cream-50 text-olive-900 hover:bg-olive-100'
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setNotice(null)
            setAddMode('add')
          }}
          className="ml-auto inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-olive-800 px-4 text-sm font-bold text-cream-50 transition-colors hover:bg-olive-900 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Plus className="size-4" aria-hidden="true" /> Add Menu Item
        </button>
      </div>

      {filtered.length === 0 ? (
        <Panel className="p-10 text-center text-sm text-stone-500">
          No menu items match “{query}”. Try a different search or category.
        </Panel>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-3.5 md:grid-cols-2 xl:grid-cols-3 lg:max-h-[calc(100dvh-24rem)] lg:overflow-y-auto lg:pr-1">
          {filtered.map((m) => (
            <MenuCard
              key={m.id}
              item={m}
              active={selected?.id === m.id}
              onSelect={() => setSelectedId(m.id)}
              onMore={() => {
                setSelectedId(m.id)
                setDetailId(m.id)
              }}
            />
          ))}
        </div>
      )}

      <RecipePanel item={selected} ingredients={ingredients} tab={recipeTab} onTab={setRecipeTab} />

      {detailItem ? (
        <ItemDetailModal
          item={detailItem}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            setNotice(null)
            setAddMode('edit')
          }}
        />
      ) : null}

      {addMode ? (
        <AddMenuModal
          mode={addMode}
          initial={editing ?? undefined}
          categories={categories}
          ingredients={ingredients}
          onClose={() => setAddMode(null)}
          onSave={handleSave}
        />
      ) : null}
    </div>
  )
}
