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
