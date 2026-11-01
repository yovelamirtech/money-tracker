// Money is always an integer number of agorot (₪12.50 → 1250). Never floats.

// Plain digits ("1200") or digits with thousands commas ("1,200"), then an optional 1–2 digit fraction.
const AMOUNT_PATTERN = /^(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?$/

/** Turns user input into agorot. Returns null for empty, zero, negative, non-numeric or >2 decimals. */
export function parseAmount(input: string): number | null {
  const match = AMOUNT_PATTERN.exec(input.trim())
  if (!match) return null

  const shekels = Number(match[1].replaceAll(',', ''))
  const agorot = Number((match[2] ?? '').padEnd(2, '0'))
  const total = shekels * 100 + agorot

  if (total <= 0 || !Number.isSafeInteger(total)) return null
  return total
}

const ilsFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'ILS',
})

/** 120000 → "₪1,200.00" */
export function formatILS(agorot: number): string {
  return ilsFormatter.format(agorot / 100)
}

/** 1250 → "12.50", -5 → "-0.05". Plain digits for CSV files and for pre-filling the amount field. */
export function toDecimalString(agorot: number): string {
  const sign = agorot < 0 ? '-' : ''
  const abs = Math.abs(agorot)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

const compactFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'ILS',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

/** 1250000 → "₪12.5K". For chart axes, where full amounts don't fit. */
export function formatCompactILS(agorot: number): string {
  return compactFormatter.format(agorot / 100)
}
