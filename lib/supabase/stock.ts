export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock'

/** Availability derived from ledger levels (same rule everywhere). */
export function stockStatus(i: {
  stock_quantity: number
  reorder_level: number
}): StockStatus {
  if (i.stock_quantity <= 0) return 'Out of Stock'
  if (i.stock_quantity <= i.reorder_level) return 'Low Stock'
  return 'In Stock'
}
