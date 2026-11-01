import { describe, expect, it } from 'vitest'
import {
  addMonths,
  daysInMonth,
  firstDayOfMonth,
  formatFullDate,
  formatMonthLabel,
  formatShortDate,
  formatShortMonth,
  lastDayOfMonth,
  lastMonths,
  todayISO,
  toMonthKey,
} from './month'

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

describe('daysInMonth', () => {
  it.each([
    ['2026-01', 31],
    ['2026-02', 28],
    ['2024-02', 29],
    ['2100-02', 28],
    ['2026-04', 30],
    ['2026-12', 31],
  ])('%s has %i days', (month, days) => {
    expect(daysInMonth(month)).toBe(days)
  })
})

describe('lastMonths', () => {
  it('returns the months ending with the given one, oldest first, across a year boundary', () => {
    expect(lastMonths('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })

  it('returns just the month for a count of 1', () => {
    expect(lastMonths('2026-10', 1)).toEqual(['2026-10'])
  })
})

describe('first and last day of month', () => {
  it('handles short months and leap years', () => {
    expect(firstDayOfMonth('2026-02')).toBe('2026-02-01')
    expect(lastDayOfMonth('2026-02')).toBe('2026-02-28')
    expect(lastDayOfMonth('2024-02')).toBe('2024-02-29')
    expect(lastDayOfMonth('2026-12')).toBe('2026-12-31')
  })
})

describe('labels', () => {
  it('formats month labels in the given locale', () => {
    expect(formatMonthLabel('2026-10', 'en-US')).toBe('October 2026')
    expect(formatShortMonth('2026-10', 'en-US')).toBe('Oct')
  })

  it('formats a full date', () => {
    expect(formatFullDate('2026-03-05')).toBe('05.03.2026')
  })
})
