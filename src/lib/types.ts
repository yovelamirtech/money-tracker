export type TransactionType = 'income' | 'expense'

export interface Category {
  id: string
  name: string // Hebrew display name
  type: TransactionType
}

export interface Transaction {
  id: string
  type: TransactionType
  amountAgorot: number // positive integer
  categoryId: string
  date: string // ISO date, YYYY-MM-DD
  note?: string
  createdAt: string // ISO timestamp
}

/** A month in the form YYYY-MM */
export type MonthKey = string
