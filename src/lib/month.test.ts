import { describe, expect, it } from 'vitest'
import { addMonths, formatMonthLabel, formatShortDate, todayISO, toMonthKey } from './month'

describe('todayISO', () => {
  it('uses local date parts with zero padding', () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('toMonthKey', () => {
  it('cuts a date down to its month', () => {
    expect(toMonthKey('2026-10-23')).toBe('2026-10')
  })
})

describe('addMonths', () => {
  it.each([
    ['2026-10', 1, '2026-11'],
    ['2026-10', -1, '2026-09'],
    ['2026-12', 1, '2027-01'],
    ['2026-01', -1, '2025-12'],
    ['2026-10', 0, '2026-10'],
    ['2026-10', 15, '2028-01'],
  ])('%s %+i → %s', (month, delta, expected) => {
    expect(addMonths(month, delta)).toBe(expected)
  })
})

describe('formatMonthLabel', () => {
  it('shows the Hebrew month name and the year', () => {
    expect(formatMonthLabel('2026-10')).toContain('אוקטובר')
    expect(formatMonthLabel('2026-10')).toContain('2026')
  })
})

describe('formatShortDate', () => {
  it('shows day.month', () => {
    expect(formatShortDate('2026-10-03')).toBe('03.10')
  })
})
