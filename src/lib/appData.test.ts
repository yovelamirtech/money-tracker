import { describe, expect, it } from 'vitest'
import { defaultCategories, UNCATEGORIZED_ID } from '../data/defaultCategories'
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
      budgets: [{ categoryId: 'groceries', limitAgorot: 5000 }, { categoryId: 'groceries' }],
    })
    expect(data.transactions).toEqual([good])
    expect(data.budgets).toEqual([{ categoryId: 'groceries', limitAgorot: 5000 }])
  })

  it('reads learned note rules, dropping broken ones', () => {
    const data = readAppDataLenient({ noteRules: [{ note: 'קפה', categoryId: 'eating-out' }, { note: '' }] })
    expect(data.noteRules).toEqual([{ note: 'קפה', categoryId: 'eating-out' }])
    expect(readAppDataLenient({}).noteRules).toEqual([])
  })

  it('adds the "other" categories back if they are missing', () => {
    const data = readAppDataLenient({ categories: [{ id: 'pets', name: 'חיות', type: 'expense' }] })
    expect(data.categories.map((c) => c.id)).toEqual(['pets', 'other-income', 'other-expense'])
  })
})

describe('validateAppData', () => {
  const valid = () => ({
    transactions: [makeTransaction({ categoryId: 'groceries' })],
    categories: defaultCategories,
    recurring: [makeRule({ categoryId: 'car' })],
    budgets: [{ categoryId: 'groceries', limitAgorot: 100000 }],
    noteRules: [{ note: 'קפה', categoryId: 'eating-out' }],
    settings: { theme: 'dark', language: 'en', lastCategoryId: {} },
  })

  it('accepts valid data', () => {
    const result = validateAppData(valid())
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.settings.theme).toBe('dark')
    if (result.ok) expect(result.data.noteRules).toEqual([{ note: 'קפה', categoryId: 'eating-out' }])
  })

  it('accepts an uncategorized expense', () => {
    const raw = { ...valid(), transactions: [makeTransaction({ categoryId: UNCATEGORIZED_ID })] }
    expect(validateAppData(raw).ok).toBe(true)
  })

  it('treats missing recurring, budgets and note rules as empty', () => {
    const { transactions, categories } = valid()
    const result = validateAppData({ transactions, categories })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.noteRules).toEqual([])
  })

  it.each([
    ['not-an-object', null],
    ['invalid-transactions', { ...valid(), transactions: [{ id: 'x' }] }],
    ['invalid-transactions', { ...valid(), transactions: undefined }],
    ['invalid-categories', { ...valid(), categories: [] }],
    ['invalid-recurring', { ...valid(), recurring: [{ id: 'r' }] }],
    ['invalid-budgets', { ...valid(), budgets: [{ categoryId: 'groceries', limitAgorot: -1 }] }],
    ['duplicate-ids', { ...valid(), transactions: [makeTransaction({ id: 'a' }), makeTransaction({ id: 'a' })] }],
    ['unknown-category', { ...valid(), transactions: [makeTransaction({ categoryId: 'nope' })] }],
    ['unknown-category', { ...valid(), transactions: [makeTransaction({ type: 'income', categoryId: 'groceries' })] }],
    ['unknown-category', { ...valid(), budgets: [{ categoryId: 'salary', limitAgorot: 100 }] }],
    ['unknown-category', { ...valid(), transactions: [makeTransaction({ type: 'income', categoryId: UNCATEGORIZED_ID })] }],
    ['unknown-category', { ...valid(), noteRules: [{ note: 'קפה', categoryId: 'nope' }] }],
    ['invalid-note-rules', { ...valid(), noteRules: [{ note: 'קפה' }] }],
    ['invalid-note-rules', { ...valid(), noteRules: 'nope' }],
  ])('rejects with %s', (error, raw) => {
    expect(validateAppData(raw)).toEqual({ ok: false, error })
  })
})
