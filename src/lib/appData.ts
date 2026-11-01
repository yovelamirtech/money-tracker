import { defaultCategories, OTHER_CATEGORY_ID } from '../data/defaultCategories'
import type { AppData, Category } from './types'
import {
  defaultSettings,
  hasDuplicateIds,
  isBudget,
  isCategory,
  isRecord,
  isRecurringRule,
  isTransaction,
  parseSettings,
} from './validate'

export function createDefaultAppData(): AppData {
  return {
    transactions: [],
    categories: defaultCategories.map((c) => ({ ...c })),
    recurring: [],
    budgets: [],
    settings: { ...defaultSettings, lastCategoryId: {} },
  }
}

/** Makes sure both "אחר" categories exist, since deleted categories move into them. */
function withOtherCategories(categories: Category[]): Category[] {
  const missing = defaultCategories.filter(
    (d) =>
      (d.id === OTHER_CATEGORY_ID.income || d.id === OTHER_CATEGORY_ID.expense) &&
      !categories.some((c) => c.id === d.id),
  )
  return [...categories, ...missing.map((c) => ({ ...c }))]
}

/**
 * Lenient read for data we wrote ourselves (localStorage): keeps every valid item and drops broken ones,
 * so one bad entry never wipes the rest. Old v1 data (`{ transactions }` only) gets default categories.
 */
export function readAppDataLenient(raw: unknown): AppData {
  const data = createDefaultAppData()
  if (!isRecord(raw)) return data

  const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
  const categories = list(raw.categories).filter(isCategory)

  return {
    transactions: list(raw.transactions).filter(isTransaction),
    categories: Array.isArray(raw.categories) && categories.length > 0 ? withOtherCategories(categories) : data.categories,
    recurring: list(raw.recurring).filter(isRecurringRule),
    budgets: list(raw.budgets).filter(isBudget),
    settings: parseSettings(raw.settings),
  }
}

export type AppDataError =
  | 'not-an-object'
  | 'invalid-transactions'
  | 'invalid-categories'
  | 'invalid-recurring'
  | 'invalid-budgets'
  | 'duplicate-ids'
  | 'unknown-category'

/**
 * Strict check for data from outside (an imported backup): every item must be valid and every
 * reference must point to an existing category of the same type. Nothing is silently dropped.
 */
export function validateAppData(raw: unknown): { ok: true; data: AppData } | { ok: false; error: AppDataError } {
  if (!isRecord(raw)) return { ok: false, error: 'not-an-object' }
  const { transactions, categories, recurring = [], budgets = [] } = raw

  if (!Array.isArray(transactions) || !transactions.every(isTransaction)) {
    return { ok: false, error: 'invalid-transactions' }
  }
  if (!Array.isArray(categories) || categories.length === 0 || !categories.every(isCategory)) {
    return { ok: false, error: 'invalid-categories' }
  }
  if (!Array.isArray(recurring) || !recurring.every(isRecurringRule)) {
    return { ok: false, error: 'invalid-recurring' }
  }
  if (!Array.isArray(budgets) || !budgets.every(isBudget)) {
    return { ok: false, error: 'invalid-budgets' }
  }
  if (hasDuplicateIds(transactions) || hasDuplicateIds(categories) || hasDuplicateIds(recurring)) {
    return { ok: false, error: 'duplicate-ids' }
  }

  const fullCategories = withOtherCategories(categories)
  const typeById = new Map(fullCategories.map((c) => [c.id, c.type]))
  const referencesOk =
    transactions.every((t) => typeById.get(t.categoryId) === t.type) &&
    recurring.every((r) => typeById.get(r.categoryId) === r.type) &&
    budgets.every((b) => typeById.get(b.categoryId) === 'expense')
  if (!referencesOk) return { ok: false, error: 'unknown-category' }

  return {
    ok: true,
    data: { transactions, categories: fullCategories, recurring, budgets, settings: parseSettings(raw.settings) },
  }
}
