// Small date helpers. Dates are plain 'YYYY-MM-DD' strings in local time.
import type { MonthKey } from './types'

function pad2(n: number): string {
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

const monthLabelFormatter = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' })

/** '2026-10' → 'אוקטובר 2026' */
export function formatMonthLabel(month: MonthKey): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return monthLabelFormatter.format(new Date(year, monthNumber - 1, 1))
}

/** '2026-10-23' → '23.10' */
export function formatShortDate(isoDate: string): string {
  const [, monthNumber, day] = isoDate.split('-')
  return `${day}.${monthNumber}`
}
