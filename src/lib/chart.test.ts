import { describe, expect, it } from 'vitest'
import { niceTicks, percentOf } from './chart'

describe('niceTicks', () => {
  it('returns [0] when there is nothing to show', () => {
    expect(niceTicks(0)).toEqual([0])
  })

  it('uses round steps that reach the maximum', () => {
    expect(niceTicks(870000, 4)).toEqual([0, 250000, 500000, 750000, 1000000])
    expect(niceTicks(1200000, 4)).toEqual([0, 500000, 1000000, 1500000])
    expect(niceTicks(10000, 4)).toEqual([0, 2500, 5000, 7500, 10000])
  })

  it('never steps below one shekel', () => {
    expect(niceTicks(150, 4)).toEqual([0, 100, 200])
  })

  it('always ends at or above the maximum', () => {
    for (const max of [1, 99, 12345, 4_999_999, 123_456_789]) {
      const ticks = niceTicks(max)
      expect(ticks.at(-1)).toBeGreaterThanOrEqual(max)
      expect(ticks.length).toBeLessThanOrEqual(7)
    }
  })
})

describe('percentOf', () => {
  it('rounds and handles zero', () => {
    expect(percentOf(1, 3)).toBe(33)
    expect(percentOf(2, 3)).toBe(67)
    expect(percentOf(5, 0)).toBe(0)
  })
})
