import type { Category } from '../lib/types'

export const defaultCategories: Category[] = [
  { id: 'salary', name: 'משכורת', type: 'income', color: 'aqua', icon: '💼' },
  { id: 'other-income', name: 'אחר', type: 'income', color: 'gray' },

  { id: 'food', name: 'אוכל', type: 'expense', color: 'orange', icon: '🛒' },
  { id: 'housing', name: 'דיור', type: 'expense', color: 'blue', icon: '🏠' },
  { id: 'bills', name: 'חשבונות', type: 'expense', color: 'yellow', icon: '💡' },
  { id: 'transport', name: 'תחבורה', type: 'expense', color: 'violet', icon: '🚌' },
  { id: 'subscriptions', name: 'מנויים', type: 'expense', color: 'magenta', icon: '📺' },
  { id: 'entertainment', name: 'בילויים', type: 'expense', color: 'red', icon: '🎉' },
  { id: 'health', name: 'בריאות', type: 'expense', color: 'green', icon: '💊' },
  { id: 'shopping', name: 'קניות', type: 'expense', color: 'magenta', icon: '🛍️' },
  { id: 'other-expense', name: 'אחר', type: 'expense', color: 'gray' },
]

/** The "אחר" category of each type. It can't be deleted; deleted categories move here. */
export const OTHER_CATEGORY_ID = {
  income: 'other-income',
  expense: 'other-expense',
} as const
