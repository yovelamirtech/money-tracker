// Small date helpers. Dates are plain 'YYYY-MM-DD' strings in local time.
import type { MonthKey } from './types'

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Today's date in local time as 'YYYY-MM-DD' (not UTC, so late-night entries get the right day). */
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

/** '2026-10-23' → '2026-10' */
export function toMonthKey(isoDate: string): MonthKey {
  return isoDate.slice(0, 7)
}

/** Moves a month key forward or back: ('2026-12', 1) → '2027-01' */
export function addMonths(month: MonthKey, delta: number): MonthKey {
  const [year, monthNumber] = month.split('-').map(Number)
  const index = year * 12 + (monthNumber - 1) + delta
  return `${Math.floor(index / 12)}-${pad2((index % 12) + 1)}`
}

/** '2024-02' → 29 */
export function daysInMonth(month: MonthKey): number {
  const [year, monthNumber] = month.split('-').map(Number)
  // Day 0 of the next month is the last day of this one.
  return new Date(year, monthNumber, 0).getDate()
}

/** The `count` months ending with `end`, oldest first: ('2026-02', 3) → ['2025-12', '2026-01', '2026-02'] */
export function lastMonths(end: MonthKey, count: number): MonthKey[] {
  return Array.from({ length: count }, (_, i) => addMonths(end, i - count + 1))
}

/** '2026-10' → '2026-10-01' */
export function firstDayOfMonth(month: MonthKey): string {
  return `${month}-01`
}

/** '2026-02' → '2026-02-28' */
export function lastDayOfMonth(month: MonthKey): string {
  return `${month}-${pad2(daysInMonth(month))}`
}

const monthLabelFormatters = new Map<string, Intl.DateTimeFormat>()

function monthFormatter(locale: string, month: 'long' | 'short'): Intl.DateTimeFormat {
  const key = `${locale}|${month}`
  let formatter = monthLabelFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, month === 'long' ? { month, year: 'numeric' } : { month })
    monthLabelFormatters.set(key, formatter)
  }
  return formatter
}

function monthToDate(month: MonthKey): Date {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(year, monthNumber - 1, 1)
}

/** '2026-10' → 'אוקטובר 2026' (or 'October 2026' for 'en-US') */
export function formatMonthLabel(month: MonthKey, locale = 'he-IL'): string {
  return monthFormatter(locale, 'long').format(monthToDate(month))
}

/** '2026-10' → 'אוק׳' / 'Oct' — for chart axes */
export function formatShortMonth(month: MonthKey, locale = 'he-IL'): string {
  return monthFormatter(locale, 'short').format(monthToDate(month))
}

/** '2026-10-23' → '23.10' */
export function formatShortDate(isoDate: string): string {
  const [, monthNumber, day] = isoDate.split('-')
  return `${day}.${monthNumber}`
}

/** '2026-10-23' → '23.10.2026' */
export function formatFullDate(isoDate: string): string {
  const [year, monthNumber, day] = isoDate.split('-')
  return `${day}.${monthNumber}.${year}`
}
