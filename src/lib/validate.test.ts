import { describe, expect, it } from 'vitest'
import { makeRule, makeTransaction } from '../test/factories'
import {
  hasDuplicateIds,
  isBudget,
  isCategory,
  isISODate,
  isMonthKey,
  isRecurringRule,
  isTransaction,
  parseSettings,
} from './validate'

describe('isISODate', () => {
  it.each(['2026-10-23', '2024-02-29', '2026-12-31'])('accepts %s', (value) => {
    expect(isISODate(value)).toBe(true)
  })

  it.each(['2026-02-30', '2026-13-01', '2026-1-1', '23/10/2026', '', 20261023, null])('rejects %s', (value) => {
    expect(isISODate(value)).toBe(false)
  })
})

describe('isMonthKey', () => {
  it('accepts YYYY-MM and rejects other shapes', () => {
    expect(isMonthKey('2026-10')).toBe(true)
    expect(isMonthKey('2026-13')).toBe(false)
    expect(isMonthKey('2026-00')).toBe(false)
    expect(isMonthKey('2026-10-01')).toBe(false)
  })
})

describe('isTransaction', () => {
  it('accepts a valid transaction, with or without optional fields', () => {
    expect(isTransaction(makeTransaction())).toBe(true)
    expect(isTransaction(makeTransaction({ note: 'x', recurringId: 'r1' }))).toBe(true)
  })

  it.each([
    ['float amount', { amountAgorot: 12.5 }],
    ['zero amount', { amountAgorot: 0 }],
    ['negative amount', { amountAgorot: -100 }],
    ['amount as string', { amountAgorot: '100' }],
    ['unknown type', { type: 'transfer' }],
    ['bad date', { date: '2026-02-30' }],
    ['empty category', { categoryId: '' }],
    ['note not a string', { note: 5 }],
  ])('rejects %s', (_, override) => {
    expect(isTransaction({ ...makeTransaction(), ...override })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isTransaction(null)).toBe(false)
    expect(isTransaction([])).toBe(false)
    expect(isTransaction('x')).toBe(false)
  })
})

describe('isCategory', () => {
  it('accepts a category with a known color and rejects an unknown one', () => {
    expect(isCategory({ id: 'a', name: 'א', type: 'expense', color: 'blue', icon: '🍕' })).toBe(true)
    expect(isCategory({ id: 'a', name: 'א', type: 'expense', color: 'chartreuse' })).toBe(false)
    expect(isCategory({ id: 'a', name: '  ', type: 'expense' })).toBe(false)
  })
})

describe('isRecurringRule', () => {
  it('checks the day of month and month keys', () => {
    expect(isRecurringRule(makeRule())).toBe(true)
    expect(isRecurringRule(makeRule({ dayOfMonth: 0 }))).toBe(false)
    expect(isRecurringRule(makeRule({ dayOfMonth: 32 }))).toBe(false)
    expect(isRecurringRule(makeRule({ dayOfMonth: 1.5 }))).toBe(false)
    expect(isRecurringRule(makeRule({ startMonth: '2026-13' }))).toBe(false)
    expect(isRecurringRule(makeRule({ lastGeneratedMonth: 'soon' }))).toBe(false)
  })
})

describe('isBudget', () => {
  it('needs a positive integer limit', () => {
    expect(isBudget({ categoryId: 'groceries', limitAgorot: 100000 })).toBe(true)
    expect(isBudget({ categoryId: 'groceries', limitAgorot: 0 })).toBe(false)
    expect(isBudget({ categoryId: 'groceries', limitAgorot: 10.5 })).toBe(false)
  })
})

describe('parseSettings', () => {
  it('falls back to defaults for missing or broken values', () => {
    expect(parseSettings(undefined)).toEqual({ theme: 'system', language: 'he', lastCategoryId: {} })
    expect(parseSettings({ theme: 'neon', language: 'fr', lastCategoryId: { expense: 5 } })).toEqual({
      theme: 'system',
      language: 'he',
      lastCategoryId: {},
    })
  })

  it('keeps valid values', () => {
    const settings = { theme: 'dark', language: 'en', lastCategoryId: { expense: 'groceries', income: 'salary' } }
    expect(parseSettings(settings)).toEqual(settings)
  })
})

describe('hasDuplicateIds', () => {
  it('detects repeated ids', () => {
    expect(hasDuplicateIds([{ id: 'a' }, { id: 'b' }])).toBe(false)
    expect(hasDuplicateIds([{ id: 'a' }, { id: 'a' }])).toBe(true)
  })
})
