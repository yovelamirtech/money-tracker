import type { Category } from '../lib/types'

export const defaultCategories: Category[] = [
  { id: 'salary', name: 'משכורת', type: 'income', color: 'aqua', icon: '💼' },
  { id: 'other-income', name: 'אחר', type: 'income', color: 'gray' },

  { id: 'bills', name: 'חשבונות', type: 'expense', color: 'yellow', icon: '💡' },
  { id: 'groceries', name: 'סופר', type: 'expense', color: 'orange', icon: '🛒' },
  { id: 'eating-out', name: 'אוכל בחוץ', type: 'expense', color: 'red', icon: '🍔' },
  { id: 'transport', name: 'תחבורה', type: 'expense', color: 'violet', icon: '🚌' },
  { id: 'car', name: 'רכב', type: 'expense', color: 'blue', icon: '🚗' },
  { id: 'health', name: 'בריאות', type: 'expense', color: 'green', icon: '💊' },
  { id: 'shopping', name: 'קניות', type: 'expense', color: 'magenta', icon: '🛍️' },
  { id: 'entertainment', name: 'בילויים', type: 'expense', color: 'aqua', icon: '🎉' },
  { id: 'other-expense', name: 'אחר', type: 'expense', color: 'gray' },
]

/** The "אחר" category of each type. It can't be deleted; deleted categories move here. */
export const OTHER_CATEGORY_ID = {
  income: 'other-income',
  expense: 'other-expense',
} as const

/**
 * The category id of an expense typed on the entry screen that has no category yet.
 * It is not a real category: it never appears in the categories list, and the sort screen replaces it.
 */
export const UNCATEGORIZED_ID = 'uncategorized'
