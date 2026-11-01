import { describe, expect, it } from 'vitest'
import { makeTransaction } from '../test/factories'
import { emptyFilter, filterByDateRange, filterTransactions, isFilterEmpty } from './filter'

const coffee = makeTransaction({ id: 'coffee', amountAgorot: 1500, categoryId: 'groceries', note: 'קפה בבוקר' })
const rent = makeTransaction({ id: 'rent', amountAgorot: 450000, categoryId: 'car', note: 'Rent October' })
const salary = makeTransaction({ id: 'salary', type: 'income', amountAgorot: 1200000, categoryId: 'salary' })
const all = [coffee, rent, salary]

const ids = (list: { id: string }[]) => list.map((t) => t.id)

describe('filterTransactions', () => {
  it('returns everything for an empty filter', () => {
    expect(filterTransactions(all, emptyFilter)).toEqual(all)
    expect(isFilterEmpty(emptyFilter)).toBe(true)
  })

  it('matches text in the note, ignoring case and surrounding spaces', () => {
    expect(ids(filterTransactions(all, { ...emptyFilter, text: '  rent ' }))).toEqual(['rent'])
    expect(ids(filterTransactions(all, { ...emptyFilter, text: 'קפה' }))).toEqual(['coffee'])
    expect(filterTransactions(all, { ...emptyFilter, text: 'nothing' })).toEqual([])
  })

  it('filters by type and by category', () => {
    expect(ids(filterTransactions(all, { ...emptyFilter, type: 'income' }))).toEqual(['salary'])
    expect(ids(filterTransactions(all, { ...emptyFilter, type: 'expense' }))).toEqual(['coffee', 'rent'])
    expect(ids(filterTransactions(all, { ...emptyFilter, categoryId: 'car' }))).toEqual(['rent'])
  })

  it('filters by an inclusive amount range', () => {
    expect(ids(filterTransactions(all, { ...emptyFilter, minAgorot: 1500, maxAgorot: 450000 }))).toEqual([
      'coffee',
      'rent',
    ])
    expect(ids(filterTransactions(all, { ...emptyFilter, minAgorot: 1501 }))).toEqual(['rent', 'salary'])
    expect(ids(filterTransactions(all, { ...emptyFilter, maxAgorot: 1499 }))).toEqual([])
  })

  it('combines all conditions', () => {
    const filter = { text: 'rent', type: 'expense' as const, categoryId: 'car', minAgorot: 100, maxAgorot: null }
    expect(ids(filterTransactions(all, filter))).toEqual(['rent'])
    expect(isFilterEmpty(filter)).toBe(false)
  })
})

describe('filterByDateRange', () => {
  const days = ['2026-09-30', '2026-10-01', '2026-10-31', '2026-11-01'].map((date) => makeTransaction({ id: date, date }))

  it('includes both ends', () => {
    expect(ids(filterByDateRange(days, '2026-10-01', '2026-10-31'))).toEqual(['2026-10-01', '2026-10-31'])
  })

  it('treats an empty bound as no limit', () => {
    expect(ids(filterByDateRange(days, '', '2026-10-01'))).toEqual(['2026-09-30', '2026-10-01'])
    expect(ids(filterByDateRange(days, '2026-10-31', ''))).toEqual(['2026-10-31', '2026-11-01'])
    expect(filterByDateRange(days, '', '')).toEqual(days)
  })
})
