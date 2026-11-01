import { describe, expect, it } from 'vitest'
import { formatCompactILS, formatILS, parseAmount, toDecimalString } from './money'

describe('parseAmount', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['12.50', 1250],
    ['0.01', 1],
    ['0.5', 50],
    ['1,200', 120000],
    ['1,200.75', 120075],
    ['1,234,567', 123456700],
    ['  42  ', 4200],
  ])('parses "%s" to %i agorot', (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })

  it.each([
    ['empty', ''],
    ['spaces only', '   '],
    ['zero', '0'],
    ['zero with decimals', '0.00'],
    ['negative', '-5'],
    ['text', 'abc'],
    ['number with text', '12abc'],
    ['more than 2 decimals', '12.345'],
    ['bad thousands commas', '1,20'],
    ['two dots', '1.2.3'],
    ['trailing dot', '12.'],
  ])('returns null for %s ("%s")', (_label, input) => {
    expect(parseAmount(input)).toBeNull()
  })

  it('avoids float traps: 0.1 + 0.2 style values stay exact', () => {
    // 0.29 * 100 is 28.999999999999996 in floating point
    expect(parseAmount('0.29')).toBe(29)
    expect(parseAmount('1.15')).toBe(115)
    expect(parseAmount('4.35')).toBe(435)
    expect(parseAmount('0.1')! + parseAmount('0.2')!).toBe(parseAmount('0.3'))
  })

  it('always returns an integer', () => {
    for (const input of ['19.99', '0.07', '1,000.01', '33.33']) {
      expect(Number.isInteger(parseAmount(input))).toBe(true)
    }
  })
})

describe('formatILS', () => {
  it.each([
    [120000, '₪1,200.00'],
    [1250, '₪12.50'],
    [1, '₪0.01'],
    [0, '₪0.00'],
    [-5000, '-₪50.00'],
  ])('formats %i agorot as %s', (agorot, expected) => {
    expect(formatILS(agorot)).toBe(expected)
  })
})

describe('toDecimalString', () => {
  it.each([
    [1250, '12.50'],
    [120000, '1200.00'],
    [5, '0.05'],
    [0, '0.00'],
    [-5, '-0.05'],
    [-123456, '-1234.56'],
  ])('%i → %s', (agorot, expected) => {
    expect(toDecimalString(agorot)).toBe(expected)
  })

  it('round-trips through parseAmount', () => {
    for (const agorot of [1, 29, 115, 1250, 999999]) {
      expect(parseAmount(toDecimalString(agorot))).toBe(agorot)
    }
  })
})

describe('formatCompactILS', () => {
  it.each([
    [0, '₪0'],
    [50000, '₪500'],
    [250000, '₪2.5K'],
    [1250000, '₪12.5K'],
    [150000000, '₪1.5M'],
  ])('%i → %s', (agorot, expected) => {
    expect(formatCompactILS(agorot)).toBe(expected)
  })
})
