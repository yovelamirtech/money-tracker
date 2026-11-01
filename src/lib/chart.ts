// Axis helpers for the charts. Values are agorot.

const STEPS = [1, 2, 2.5, 5, 10]

/**
 * Round axis ticks from 0 up to at least `max`, about `count` steps: niceTicks(870000, 4) → [0, 250000, 500000, 750000, 1000000].
 * Steps are 1 / 2 / 2.5 / 5 × a power of ten, counted in whole shekels.
 */
export function niceTicks(maxAgorot: number, count = 4): number[] {
  if (maxAgorot <= 0) return [0]
  const maxShekels = maxAgorot / 100
  const rough = maxShekels / count
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = Math.max(1, (STEPS.find((s) => s * magnitude >= rough) ?? 10) * magnitude)
  const ticks: number[] = []
  for (let value = 0; ticks.length === 0 || ticks[ticks.length - 1] < maxShekels; value += step) {
    ticks.push(value)
  }
  return ticks.map((shekels) => Math.round(shekels * 100))
}

/** Percent of `part` in `whole`, rounded to a whole number (0 when whole is 0). */
export function percentOf(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part * 100) / whole)
}
