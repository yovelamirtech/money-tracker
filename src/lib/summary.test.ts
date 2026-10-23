import { describe, expect, it } from 'vitest'
import { parseAmount } from './money'
import { filterByMonth, groupByCategory, sortNewestFirst, summarize } from './summary'
import type { Transaction } from './types'

let nextId = 1
function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  const id = String(nextId++)
  return {
    id,
    type: 'expense',
    amountAgorot: 1000,
    categoryId: 'food',
    date: '2026-10-15',
    createdAt: `2026-10-15T10:00:00.000Z`,
    ...overrides,
  }
}

describe('filterByMonth', () => {
  it('returns an empty list for no transactions', () => {
    expect(filterByMonth([], '2026-10')).toEqual([])
  })

  it('keeps the first and last day of the month and drops the days around it', () => {
    const lastDayOfPrev = makeTransaction({ date: '2026-09-30' })
    const firstDay = makeTransaction({ date: '2026-10-01' })
    const lastDay = makeTransaction({ date: '2026-10-31' })
    const firstDayOfNext = makeTransaction({ date: '2026-11-01' })

    const result = filterByMonth([lastDayOfPrev, firstDay, lastDay, firstDayOfNext], '2026-10')

    expect(result).toEqual([firstDay, lastDay])
  })

  it('handles the year boundary', () => {
    const dec31 = makeTransaction({ date: '2025-12-31' })
    const jan1 = makeTransaction({ date: '2026-01-01' })

    expect(filterByMonth([dec31, jan1], '2025-12')).toEqual([dec31])
    expect(filterByMonth([dec31, jan1], '2026-01')).toEqual([jan1])
  })

  it('handles February in a leap year', () => {
    const feb29 = makeTransaction({ date: '2028-02-29' })
    const mar1 = makeTransaction({ date: '2028-03-01' })

    expect(filterByMonth([feb29, mar1], '2028-02')).toEqual([feb29])
  })

  it('does not confuse the same month in a different year', () => {
    const lastYear = makeTransaction({ date: '2025-10-15' })
    expect(filterByMonth([lastYear], '2026-10')).toEqual([])
  })
})

describe('summarize', () => {
  it('returns zeros for an empty list', () => {
    expect(summarize([])).toEqual({ income: 0, expense: 0, balance: 0 })
  })

  it('handles only income', () => {
    const result = summarize([
      makeTransaction({ type: 'income', amountAgorot: 1_000_000 }),
      makeTransaction({ type: 'income', amountAgorot: 50_000 }),
    ])
    expect(result).toEqual({ income: 1_050_000, expense: 0, balance: 1_050_000 })
  })

  it('handles only expenses (negative balance)', () => {
    const result = summarize([
      makeTransaction({ amountAgorot: 2500 }),
      makeTransaction({ amountAgorot: 7550 }),
    ])
    expect(result).toEqual({ income: 0, expense: 10050, balance: -10050 })
  })

  it('handles a mix where expenses are bigger than income', () => {
    const result = summarize([
      makeTransaction({ type: 'income', amountAgorot: 10000 }),
      makeTransaction({ type: 'expense', amountAgorot: 15000 }),
    ])
    expect(result).toEqual({ income: 10000, expense: 15000, balance: -5000 })
  })

  it('adds 0.10 + 0.20 exactly (no float trap)', () => {
    const result = summarize([
      makeTransaction({ type: 'income', amountAgorot: parseAmount('0.1')! }),
      makeTransaction({ type: 'income', amountAgorot: parseAmount('0.2')! }),
    ])
    expect(result.income).toBe(30)
  })

  it('stays exact over many small amounts', () => {
    const transactions = Array.from({ length: 1000 }, () =>
      makeTransaction({ amountAgorot: parseAmount('0.01')! }),
    )
    expect(summarize(transactions).expense).toBe(1000)
  })
})

describe('groupByCategory', () => {
  it('returns an empty list for no transactions', () => {
    expect(groupByCategory([])).toEqual([])
  })

  it('sums per category and sorts biggest first', () => {
    const result = groupByCategory([
      makeTransaction({ categoryId: 'food', amountAgorot: 3000 }),
      makeTransaction({ categoryId: 'housing', amountAgorot: 400000 }),
      makeTransaction({ categoryId: 'food', amountAgorot: 4500 }),
      makeTransaction({ categoryId: 'transport', amountAgorot: 2000 }),
    ])
    expect(result).toEqual([
      { categoryId: 'housing', total: 400000 },
      { categoryId: 'food', total: 7500 },
      { categoryId: 'transport', total: 2000 },
    ])
  })
})

describe('sortNewestFirst', () => {
  it('sorts by date, newest first', () => {
    const old = makeTransaction({ date: '2026-10-01' })
    const newer = makeTransaction({ date: '2026-10-20' })
    const middle = makeTransaction({ date: '2026-10-10' })

    expect(sortNewestFirst([old, newer, middle])).toEqual([newer, middle, old])
  })

  it('on the same date, puts the most recently added first', () => {
    const first = makeTransaction({ date: '2026-10-05', createdAt: '2026-10-05T08:00:00.000Z' })
    const second = makeTransaction({ date: '2026-10-05', createdAt: '2026-10-05T09:00:00.000Z' })

    expect(sortNewestFirst([first, second])).toEqual([second, first])
  })

  it('does not change the original array', () => {
    const list = [makeTransaction({ date: '2026-10-01' }), makeTransaction({ date: '2026-10-02' })]
    const copy = [...list]
    sortNewestFirst(list)
    expect(list).toEqual(copy)
  })
})
