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

/**
 * Share of income that was saved, as a whole percent rounded toward zero: 10,000 in and 7,500 out → 25.
 * Negative when spending was more than income. null when there was no income.
 */
export function savingsRate(summary: MonthSummary): number | null {
  if (summary.income <= 0) return null
  return Math.trunc((summary.balance * 100) / summary.income)
}

export interface MonthTotals extends MonthSummary {
  month: MonthKey
}

/** Income, expenses and balance for each month in `months`, in the same order. */
export function monthlyTotals(transactions: Transaction[], months: MonthKey[]): MonthTotals[] {
  return months.map((month) => ({ month, ...summarize(filterByMonth(transactions, month)) }))
}

export interface CategoryChange {
  categoryId: string
  current: number // agorot this month
  previous: number // agorot last month
  change: number // current - previous
}

/** Expense change per category between two months; biggest change (up or down) first, unchanged left out. */
export function compareExpensesByCategory(current: Transaction[], previous: Transaction[]): CategoryChange[] {
  const expenses = (list: Transaction[]) => new Map(
    groupByCategory(list.filter((t) => t.type === 'expense')).map((c) => [c.categoryId, c.total]),
  )
  const now = expenses(current)
  const before = expenses(previous)
  const ids = new Set([...now.keys(), ...before.keys()])

  return [...ids]
    .map((categoryId) => {
      const c = now.get(categoryId) ?? 0
      const p = before.get(categoryId) ?? 0
      return { categoryId, current: c, previous: p, change: c - p }
    })
    .filter((c) => c.change !== 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
}
