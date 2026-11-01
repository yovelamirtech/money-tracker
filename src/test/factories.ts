import type { RecurringRule, Transaction } from '../lib/types'

let nextId = 1

export function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  const id = `t${nextId++}`
  return {
    id,
    type: 'expense',
    amountAgorot: 1000,
    categoryId: 'groceries',
    date: '2026-10-15',
    createdAt: '2026-10-15T10:00:00.000Z',
    ...overrides,
  }
}

export function makeRule(overrides: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: `r${nextId++}`,
    type: 'expense',
    amountAgorot: 450000,
    categoryId: 'car',
    dayOfMonth: 1,
    startMonth: '2026-08',
    active: true,
    createdAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  }
}

/** Sequential ids: id-1, id-2, ... */
export function idSequence(prefix = 'id'): () => string {
  let n = 0
  return () => `${prefix}-${++n}`
}
