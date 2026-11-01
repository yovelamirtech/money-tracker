import { toDecimalString } from './money'
import type { Transaction, TransactionType } from './types'

export interface CsvLabels {
  headers: [date: string, type: string, category: string, amount: string, note: string]
  types: Record<TransactionType, string>
}

/**
 * Quotes a cell when needed. Cells that start with = + - @ (or tab / CR) get a leading ' so
 * spreadsheet apps don't run them as formulas.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

/** CSV text (CRLF line endings), oldest first. Amounts are plain positive numbers like 12.50. */
export function transactionsToCsv(
  transactions: Transaction[],
  categoryName: (categoryId: string) => string,
  labels: CsvLabels,
): string {
  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .map((t) => [t.date, labels.types[t.type], categoryName(t.categoryId), toDecimalString(t.amountAgorot), t.note ?? ''])
  return [labels.headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
