import { describe, expect, it } from 'vitest'
import { defaultCategories } from '../data/defaultCategories'
import { makeRule, makeTransaction } from '../test/factories'
import { createDefaultAppData, readAppDataLenient, validateAppData } from './appData'

describe('readAppDataLenient', () => {
  it('returns defaults for anything that is not an object', () => {
    for (const raw of [null, 42, 'text', []]) {
      expect(readAppDataLenient(raw)).toEqual(createDefaultAppData())
    }
  })

  it('reads old v1 data (transactions only) with the default categories', () => {
    const t = makeTransaction()
    const data = readAppDataLenient({ transactions: [t] })
    expect(data.transactions).toEqual([t])
    expect(data.categories).toEqual(defaultCategories)
    expect(data.recurring).toEqual([])
    expect(data.budgets).toEqual([])
  })

  it('keeps valid items and drops broken ones', () => {
    const good = makeTransaction()
    const data = readAppDataLenient({
      transactions: [good, { id: 'bad', amountAgorot: 'lots' }],
      budgets: [{ categoryId: 'food', limitAgorot: 5000 }, { categoryId: 'food' }],
    })
    expect(data.transactions).toEqual([good])
    expect(data.budgets).toEqual([{ categoryId: 'food', limitAgorot: 5000 }])
  })

  it('adds the "other" categories back if they are missing', () => {
    const data = readAppDataLenient({ categories: [{ id: 'pets', name: 'חיות', type: 'expense' }] })
    expect(data.categories.map((c) => c.id)).toEqual(['pets', 'other-income', 'other-expense'])
  })
})

describe('validateAppData', () => {
  const valid = () => ({
    transactions: [makeTransaction({ categoryId: 'food' })],
    categories: defaultCategories,
    recurring: [makeRule({ categoryId: 'housing' })],
    budgets: [{ categoryId: 'food', limitAgorot: 100000 }],
    settings: { theme: 'dark', language: 'en', lastCategoryId: {} },
  })

  it('accepts valid data', () => {
    const result = validateAppData(valid())
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.settings.theme).toBe('dark')
  })

  it('treats missing recurring and budgets as empty', () => {
    const { transactions, categories } = valid()
    expect(validateAppData({ transactions, categories }).ok).toBe(true)
  })

  it.each([
    ['not-an-object', null],
    ['invalid-transactions', { ...valid(), transactions: [{ id: 'x' }] }],
    ['invalid-transactions', { ...valid(), transactions: undefined }],
    ['invalid-categories', { ...valid(), categories: [] }],
    ['invalid-recurring', { ...valid(), recurring: [{ id: 'r' }] }],
    ['invalid-budgets', { ...valid(), budgets: [{ categoryId: 'food', limitAgorot: -1 }] }],
    ['duplicate-ids', { ...valid(), transactions: [makeTransaction({ id: 'a' }), makeTransaction({ id: 'a' })] }],
    ['unknown-category', { ...valid(), transactions: [makeTransaction({ categoryId: 'nope' })] }],
    ['unknown-category', { ...valid(), transactions: [makeTransaction({ type: 'income', categoryId: 'food' })] }],
    ['unknown-category', { ...valid(), budgets: [{ categoryId: 'salary', limitAgorot: 100 }] }],
  ])('rejects with %s', (error, raw) => {
    expect(validateAppData(raw)).toEqual({ ok: false, error })
  })
})
