// The only place that touches localStorage, so it can be swapped later.
import { createDefaultAppData, readAppDataLenient } from './appData'
import type { AppData, Transaction } from './types'

/**
 * One versioned key. v1 started as `{ transactions }`; later fields (categories, recurring,
 * budgets, settings) were added as optional, so old data still loads without a migration.
 */
export const STORAGE_KEY = 'money-tracker:v1'

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultAppData()
    return readAppDataLenient(JSON.parse(raw))
  } catch {
    return createDefaultAppData()
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage full or blocked (e.g. private mode). Nothing useful to do.
  }
}

export function loadTransactions(): Transaction[] {
  return loadData().transactions
}

/** Replaces only the transactions and keeps everything else that is stored. */
export function saveTransactions(transactions: Transaction[]): void {
  saveData({ ...loadData(), transactions })
}
