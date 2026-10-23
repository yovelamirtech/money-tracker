import type { Category } from '../lib/types'

export const defaultCategories: Category[] = [
  { id: 'salary', name: 'משכורת', type: 'income' },
  { id: 'other-income', name: 'אחר', type: 'income' },

  { id: 'food', name: 'אוכל', type: 'expense' },
  { id: 'housing', name: 'דיור', type: 'expense' },
  { id: 'bills', name: 'חשבונות', type: 'expense' },
  { id: 'transport', name: 'תחבורה', type: 'expense' },
  { id: 'subscriptions', name: 'מנויים', type: 'expense' },
  { id: 'entertainment', name: 'בילויים', type: 'expense' },
  { id: 'health', name: 'בריאות', type: 'expense' },
  { id: 'shopping', name: 'קניות', type: 'expense' },
  { id: 'other-expense', name: 'אחר', type: 'expense' },
]
