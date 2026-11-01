import type { Transaction, TransactionType } from './types'

export interface TransactionFilter {
  text: string // matched against the note, ignoring case
  type: TransactionType | 'all'
  categoryId: string // '' = any category
  minAgorot: number | null // inclusive
  maxAgorot: number | null // inclusive
}

export const emptyFilter: TransactionFilter = {
  text: '',
  type: 'all',
  categoryId: '',
  minAgorot: null,
  maxAgorot: null,
}

export function isFilterEmpty(filter: TransactionFilter): boolean {
  return (
    filter.text.trim() === '' &&
    filter.type === 'all' &&
    filter.categoryId === '' &&
    filter.minAgorot === null &&
    filter.maxAgorot === null
  )
}

export function filterTransactions(transactions: Transaction[], filter: TransactionFilter): Transaction[] {
  const text = filter.text.trim().toLocaleLowerCase()
  return transactions.filter(
    (t) =>
      (text === '' || (t.note ?? '').toLocaleLowerCase().includes(text)) &&
      (filter.type === 'all' || t.type === filter.type) &&
      (filter.categoryId === '' || t.categoryId === filter.categoryId) &&
      (filter.minAgorot === null || t.amountAgorot >= filter.minAgorot) &&
      (filter.maxAgorot === null || t.amountAgorot <= filter.maxAgorot),
  )
}

/** Transactions between two ISO dates, both inclusive. An empty bound means "no limit". */
export function filterByDateRange(transactions: Transaction[], from: string, to: string): Transaction[] {
  return transactions.filter((t) => (from === '' || t.date >= from) && (to === '' || t.date <= to))
}
