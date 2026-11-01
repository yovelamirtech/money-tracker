import { OTHER_CATEGORY_ID } from '../data/defaultCategories'
import type { AppData, Category, Settings, TransactionType } from './types'

export function isOtherCategory(id: string): boolean {
  return id === OTHER_CATEGORY_ID.income || id === OTHER_CATEGORY_ID.expense
}

export type CategoryNameError = 'empty' | 'duplicate'

/** Names must be non-empty and unique (ignoring case and spaces) within the same type. */
export function validateCategoryName(
  categories: Category[],
  name: string,
  type: TransactionType,
  exceptId?: string,
): CategoryNameError | null {
  const normalized = name.trim().toLocaleLowerCase()
  if (!normalized) return 'empty'
  const taken = categories.some(
    (c) => c.type === type && c.id !== exceptId && c.name.trim().toLocaleLowerCase() === normalized,
  )
  return taken ? 'duplicate' : null
}

export function addCategory(data: AppData, category: Category): AppData {
  return { ...data, categories: [...data.categories, { ...category, name: category.name.trim() }] }
}

/** Rename / recolor. The type and id never change, so existing transactions stay consistent. */
export function updateCategory(
  data: AppData,
  id: string,
  changes: Pick<Category, 'name' | 'color' | 'icon'>,
): AppData {
  return {
    ...data,
    categories: data.categories.map((c) => {
      if (c.id !== id) return c
      const next: Category = { id: c.id, type: c.type, name: changes.name.trim() }
      if (changes.color) next.color = changes.color
      const icon = changes.icon?.trim()
      if (icon) next.icon = icon
      return next
    }),
  }
}

/**
 * Deletes a category. Its transactions and recurring rules move to "אחר" of the same type,
 * its budget is dropped, and it is forgotten as the last-used category. "אחר" itself can't be deleted.
 */
export function deleteCategory(data: AppData, id: string): AppData {
  const category = data.categories.find((c) => c.id === id)
  if (!category || isOtherCategory(id)) return data

  const otherId = OTHER_CATEGORY_ID[category.type]
  const lastCategoryId = { ...data.settings.lastCategoryId }
  if (lastCategoryId[category.type] === id) delete lastCategoryId[category.type]

  return {
    ...data,
    categories: data.categories.filter((c) => c.id !== id),
    transactions: data.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: otherId } : t)),
    recurring: data.recurring.map((r) => (r.categoryId === id ? { ...r, categoryId: otherId } : r)),
    budgets: data.budgets.filter((b) => b.categoryId !== id),
    settings: { ...data.settings, lastCategoryId },
  }
}

/** Number of transactions in a category (shown before deleting it). */
export function countTransactionsInCategory(data: AppData, id: string): number {
  return data.transactions.filter((t) => t.categoryId === id).length
}

/** The last used category of a type if it still exists, otherwise the first category of that type. */
export function defaultCategoryFor(
  categories: Category[],
  type: TransactionType,
  lastCategoryId: Settings['lastCategoryId'],
): string {
  const last = lastCategoryId[type]
  if (last && categories.some((c) => c.id === last && c.type === type)) return last
  return categories.find((c) => c.type === type)?.id ?? ''
}
