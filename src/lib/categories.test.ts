import { describe, expect, it } from 'vitest'
import { makeRule, makeTransaction } from '../test/factories'
import { createDefaultAppData } from './appData'
import {
  addCategory,
  countTransactionsInCategory,
  defaultCategoryFor,
  deleteCategory,
  isOtherCategory,
  updateCategory,
  validateCategoryName,
} from './categories'
import type { AppData } from './types'

function sampleData(): AppData {
  return {
    ...createDefaultAppData(),
    transactions: [
      makeTransaction({ id: 'a', categoryId: 'groceries' }),
      makeTransaction({ id: 'b', categoryId: 'bills' }),
      makeTransaction({ id: 'c', categoryId: 'groceries' }),
    ],
    recurring: [makeRule({ id: 'r', categoryId: 'groceries' })],
    budgets: [
      { categoryId: 'groceries', limitAgorot: 100000 },
      { categoryId: 'bills', limitAgorot: 50000 },
    ],
    noteRules: [
      { note: 'שופרסל', categoryId: 'groceries' },
      { note: 'חשמל', categoryId: 'bills' },
    ],
    settings: { theme: 'system', language: 'he', lastCategoryId: { expense: 'groceries', income: 'salary' } },
  }
}

describe('validateCategoryName', () => {
  const { categories } = createDefaultAppData()

  it('rejects empty names', () => {
    expect(validateCategoryName(categories, '   ', 'expense')).toBe('empty')
  })

  it('rejects a name already used by the same type, ignoring spaces and case', () => {
    expect(validateCategoryName(categories, ' סופר ', 'expense')).toBe('duplicate')
    expect(validateCategoryName([{ id: 'x', name: 'Pets', type: 'expense' }], 'pets', 'expense')).toBe('duplicate')
  })

  it('allows the same name in the other type, and keeping a category its own name', () => {
    expect(validateCategoryName(categories, 'סופר', 'income')).toBeNull()
    expect(validateCategoryName(categories, 'סופר', 'expense', 'groceries')).toBeNull()
  })
})

describe('addCategory / updateCategory', () => {
  it('adds a trimmed category', () => {
    const data = addCategory(createDefaultAppData(), { id: 'pets', name: ' חיות ', type: 'expense', color: 'blue' })
    expect(data.categories.at(-1)).toEqual({ id: 'pets', name: 'חיות', type: 'expense', color: 'blue' })
  })

  it('renames and recolors without changing id or type, and drops an empty icon', () => {
    const data = updateCategory(createDefaultAppData(), 'groceries', { name: 'מכולת', color: 'green', icon: ' ' })
    expect(data.categories.find((c) => c.id === 'groceries')).toEqual({
      id: 'groceries',
      name: 'מכולת',
      type: 'expense',
      color: 'green',
    })
  })
})

describe('deleteCategory', () => {
  it('moves its transactions and recurring rules to "אחר" and removes its budget and note rules', () => {
    const data = deleteCategory(sampleData(), 'groceries')

    expect(data.categories.some((c) => c.id === 'groceries')).toBe(false)
    expect(data.transactions.map((t) => t.categoryId)).toEqual(['other-expense', 'bills', 'other-expense'])
    expect(data.recurring[0].categoryId).toBe('other-expense')
    expect(data.budgets).toEqual([{ categoryId: 'bills', limitAgorot: 50000 }])
    expect(data.noteRules).toEqual([{ note: 'חשמל', categoryId: 'bills' }])
  })

  it('forgets it as the last used category', () => {
    const data = deleteCategory(sampleData(), 'groceries')
    expect(data.settings.lastCategoryId).toEqual({ income: 'salary' })
  })

  it('moves income categories to the income "אחר"', () => {
    const start = { ...sampleData(), transactions: [makeTransaction({ type: 'income', categoryId: 'salary' })] }
    expect(deleteCategory(start, 'salary').transactions[0].categoryId).toBe('other-income')
  })

  it('does not delete "אחר" or an unknown id', () => {
    const start = sampleData()
    expect(deleteCategory(start, 'other-expense')).toBe(start)
    expect(deleteCategory(start, 'nope')).toBe(start)
    expect(isOtherCategory('other-income')).toBe(true)
    expect(isOtherCategory('groceries')).toBe(false)
  })
})

describe('countTransactionsInCategory', () => {
  it('counts transactions of one category', () => {
    expect(countTransactionsInCategory(sampleData(), 'groceries')).toBe(2)
    expect(countTransactionsInCategory(sampleData(), 'health')).toBe(0)
  })
})

describe('defaultCategoryFor', () => {
  const { categories } = createDefaultAppData()

  it('uses the last used category of the type', () => {
    expect(defaultCategoryFor(categories, 'expense', { expense: 'bills' })).toBe('bills')
  })

  it('falls back to the first category when the last one is gone or of the other type', () => {
    expect(defaultCategoryFor(categories, 'expense', {})).toBe('bills')
    expect(defaultCategoryFor(categories, 'expense', { expense: 'deleted' })).toBe('bills')
    expect(defaultCategoryFor(categories, 'income', { income: 'groceries' })).toBe('salary')
    expect(defaultCategoryFor([], 'income', {})).toBe('')
  })
})
