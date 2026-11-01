// The only place that touches localStorage, so it can be swapped later.
import { createDefaultAppData, readAppDataLenient } from './appData'
import type { AppData, Transaction } from './types'

/**
 * One versioned key. Fields added later (like noteRules) are optional, so older data under the
 * same key still loads without a migration.
 */
export const STORAGE_KEY = 'money-tracker:v2'

/**
 * v1 used the old category set. Moving to v2 started everyone fresh (by choice: there was no real
 * data yet), so v1 is removed on load rather than migrated.
 */
export const OLD_STORAGE_KEYS = ['money-tracker:v1']

export function loadData(): AppData {
  try {
    for (const key of OLD_STORAGE_KEYS) localStorage.removeItem(key)
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
