import { describe, expect, it } from 'vitest'
import { UNCATEGORIZED_ID } from '../data/defaultCategories'
import { makeTransaction } from '../test/factories'
import { createDefaultAppData } from './appData'
import {
  assignCategory,
  createEntry,
  guessCategory,
  learnRule,
  normalizeNote,
  parseEntry,
  recentEntries,
  restoreTransactions,
  uncategorizedQueue,
} from './entry'
import type { AppData } from './types'

describe('parseEntry', () => {
  it.each([
    ['שכ״ד4000', 400000, 'שכ״ד'],
    ['שכ״ד 4000', 400000, 'שכ״ד'],
    ['4000 שכ״ד', 400000, 'שכ״ד'],
    ['קפה 18.5', 1850, 'קפה'],
    ['סופר 1,200', 120000, 'סופר'],
    ['קפה 18.', 1800, 'קפה'],
    ['רב קו 2 50', 5000, 'רב קו 2'],
    ['דלק 250₪', 25000, 'דלק'],
    ['דלק 250 ש״ח', 25000, 'דלק'],
    ['דלק 250 ש"ח', 25000, 'דלק'],
    ['דלק: 250 שקלים', 25000, 'דלק'],
    ['  משכורת   10000  ', 1000000, 'משכורת'],
    ['50', 5000, ''],
  ])('%s → %i agorot, note "%s"', (text, amountAgorot, note) => {
    expect(parseEntry(text)).toEqual({ ok: true, amountAgorot, note })
  })

  it('needs an amount', () => {
    expect(parseEntry('קפה')).toEqual({ ok: false, error: 'no-amount' })
    expect(parseEntry('')).toEqual({ ok: false, error: 'no-amount' })
  })

  it('rejects an amount that is zero or has too many decimals', () => {
    expect(parseEntry('קפה 0')).toEqual({ ok: false, error: 'bad-amount' })
    expect(parseEntry('קפה 1.234')).toEqual({ ok: false, error: 'bad-amount' })
    expect(parseEntry('קפה 1,2')).toEqual({ ok: false, error: 'bad-amount' })
  })

  it('keeps currency-like letters that are part of a word', () => {
    expect(parseEntry('שחייה 40')).toEqual({ ok: true, amountAgorot: 4000, note: 'שחייה' })
  })
})

describe('normalizeNote', () => {
  it('ignores quote marks, case and extra spaces', () => {
    expect(normalizeNote(' שכ״ד ')).toBe('שכד')
    expect(normalizeNote('שכ"ד')).toBe('שכד')
    expect(normalizeNote('Super  Pharm')).toBe('super pharm')
  })
})

describe('guessCategory / createEntry', () => {
  const data = createDefaultAppData()

  it('has no category for an unknown note', () => {
    expect(guessCategory('שכ״ד', [], data.categories)).toBeUndefined()
    expect(guessCategory('', [], data.categories)).toBeUndefined()
  })

  it('uses a learned rule for the same note, written any way', () => {
    const rules = learnRule([], 'שכ״ד', 'bills')
    expect(guessCategory('שכ"ד', rules, data.categories)?.id).toBe('bills')
  })

  it('treats "משכורת" as salary income unless a rule says otherwise', () => {
    expect(guessCategory('משכורת אוקטובר', [], data.categories)?.id).toBe('salary')
    const rules = learnRule([], 'משכורת', 'other-income')
    expect(guessCategory('משכורת', rules, data.categories)?.id).toBe('other-income')
  })

  it('ignores a rule whose category was deleted', () => {
    const rules = [{ note: 'קפה', categoryId: 'gone' }]
    expect(guessCategory('קפה', rules, data.categories)).toBeUndefined()
  })

  it('creates an uncategorized expense, or one with the guessed category and its type', () => {
    expect(createEntry({ amountAgorot: 400000, note: 'שכ״ד' }, data, 'a', '2026-11-01', 'now')).toEqual({
      id: 'a',
      type: 'expense',
      amountAgorot: 400000,
      categoryId: UNCATEGORIZED_ID,
      date: '2026-11-01',
      note: 'שכ״ד',
      createdAt: 'now',
    })
    expect(createEntry({ amountAgorot: 1000000, note: 'משכורת' }, data, 'b', '2026-11-01', 'now')).toMatchObject({
      type: 'income',
      categoryId: 'salary',
    })
    expect(createEntry({ amountAgorot: 5000, note: '' }, data, 'c', '2026-11-01', 'now')).not.toHaveProperty('note')
  })
})

describe('learnRule', () => {
  it('replaces an older rule for the same note', () => {
    const rules = learnRule(learnRule([], 'קפה', 'groceries'), 'קפה ', 'eating-out')
    expect(rules).toEqual([{ note: 'קפה', categoryId: 'eating-out' }])
  })

  it('learns nothing for an empty note or for "no category"', () => {
    expect(learnRule([], '', 'bills')).toEqual([])
    expect(learnRule([], undefined, 'bills')).toEqual([])
    expect(learnRule([], 'קפה', UNCATEGORIZED_ID)).toEqual([])
  })
})

describe('assignCategory / restoreTransactions', () => {
  function sample(): AppData {
    return {
      ...createDefaultAppData(),
      transactions: [
        makeTransaction({ id: 'a', categoryId: UNCATEGORIZED_ID, note: 'קפה' }),
        makeTransaction({ id: 'b', categoryId: UNCATEGORIZED_ID, note: 'קפה ' }),
        makeTransaction({ id: 'c', categoryId: UNCATEGORIZED_ID, note: 'דלק' }),
        makeTransaction({ id: 'd', categoryId: 'groceries', note: 'קפה' }),
        makeTransaction({ id: 'e', categoryId: UNCATEGORIZED_ID }),
        makeTransaction({ id: 'f', categoryId: UNCATEGORIZED_ID }),
      ],
    }
  }

  it('sorts every uncategorized entry with the same note and learns it', () => {
    const { data, before } = assignCategory(sample(), 'a', 'eating-out')
    expect(data.transactions.map((t) => t.categoryId)).toEqual([
      'eating-out',
      'eating-out',
      UNCATEGORIZED_ID,
      'groceries', // already had a category: left alone
      UNCATEGORIZED_ID,
      UNCATEGORIZED_ID,
    ])
    expect(before.map((t) => t.id)).toEqual(['a', 'b'])
    expect(data.noteRules).toEqual([{ note: 'קפה', categoryId: 'eating-out' }])
  })

  it('sorts only the one entry when it has no note', () => {
    const { data } = assignCategory(sample(), 'e', 'bills')
    expect(data.transactions.find((t) => t.id === 'f')?.categoryId).toBe(UNCATEGORIZED_ID)
    expect(data.noteRules).toEqual([])
  })

  it('makes it income when the category is an income one', () => {
    const { data } = assignCategory(sample(), 'c', 'other-income')
    expect(data.transactions.find((t) => t.id === 'c')).toMatchObject({ type: 'income', categoryId: 'other-income' })
  })

  it('does nothing for an unknown transaction or category', () => {
    const start = sample()
    expect(assignCategory(start, 'nope', 'bills')).toEqual({ data: start, before: [] })
    expect(assignCategory(start, 'a', 'nope')).toEqual({ data: start, before: [] })
  })

  it('undo puts the transactions and rules back', () => {
    const start = sample()
    const { data, before } = assignCategory(start, 'a', 'eating-out')
    expect(restoreTransactions(data, before, start.noteRules)).toEqual(start)
  })
})

describe('uncategorizedQueue / recentEntries', () => {
  const list = [
    makeTransaction({ id: 'new', categoryId: UNCATEGORIZED_ID, createdAt: '2026-10-20T10:00:00Z' }),
    makeTransaction({ id: 'sorted', categoryId: 'bills', createdAt: '2026-10-25T10:00:00Z' }),
    makeTransaction({ id: 'old', categoryId: UNCATEGORIZED_ID, createdAt: '2026-10-01T10:00:00Z' }),
  ]

  it('lists uncategorized entries, oldest first', () => {
    expect(uncategorizedQueue(list).map((t) => t.id)).toEqual(['old', 'new'])
  })

  it('lists the latest entries by when they were entered', () => {
    expect(recentEntries(list, 2).map((t) => t.id)).toEqual(['sorted', 'new'])
  })
})
