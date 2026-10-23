import type { MonthKey, Transaction } from './types'

export interface MonthSummary {
  income: number // agorot
  expense: number // agorot
  balance: number // agorot, income - expense (can be negative)
}

export interface CategoryTotal {
  categoryId: string
  total: number // agorot
}

/** Keeps only transactions whose date is in the given month ('YYYY-MM'). */
export function filterByMonth(transactions: Transaction[], month: MonthKey): Transaction[] {
  return transactions.filter((t) => t.date.startsWith(`${month}-`))
}

export function summarize(transactions: Transaction[]): MonthSummary {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (t.type === 'income') income += t.amountAgorot
    else expense += t.amountAgorot
  }
  return { income, expense, balance: income - expense }
}

/** Total per category, biggest first. */
export function groupByCategory(transactions: Transaction[]): CategoryTotal[] {
  const totals = new Map<string, number>()
  for (const t of transactions) {
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amountAgorot)
  }
  return [...totals]
    .map(([categoryId, total]) => ({ categoryId, total }))
    .sort((a, b) => b.total - a.total)
}

/** Newest date first; same date → most recently added first. Does not mutate the input. */
export function sortNewestFirst(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  )
}
