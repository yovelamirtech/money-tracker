// The only place that touches localStorage, so it can be swapped later.
import type { Transaction } from './types'

export const STORAGE_KEY = 'money-tracker:v1'

interface StoredData {
  transactions: Transaction[]
}

export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as Partial<StoredData> | null
    return Array.isArray(data?.transactions) ? data.transactions : []
  } catch {
    return []
  }
}

export function saveTransactions(transactions: Transaction[]): void {
  const data: StoredData = { transactions }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage full or blocked (e.g. private mode). Nothing useful to do in the MVP.
  }
}
