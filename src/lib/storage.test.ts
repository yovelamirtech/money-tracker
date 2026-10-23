import { describe, expect, it } from 'vitest'
import { loadTransactions, saveTransactions, STORAGE_KEY } from './storage'
import type { Transaction } from './types'

const sample: Transaction[] = [
  {
    id: 'a',
    type: 'expense',
    amountAgorot: 1250,
    categoryId: 'food',
    date: '2026-10-23',
    note: 'פלאפל',
    createdAt: '2026-10-23T12:00:00.000Z',
  },
  {
    id: 'b',
    type: 'income',
    amountAgorot: 1_000_000,
    categoryId: 'salary',
    date: '2026-10-01',
    createdAt: '2026-10-01T09:00:00.000Z',
  },
]

describe('storage', () => {
  it('returns [] when storage is empty', () => {
    expect(loadTransactions()).toEqual([])
  })

  it('save → load round-trip returns the same transactions', () => {
    saveTransactions(sample)
    expect(loadTransactions()).toEqual(sample)
  })

  it('saves under the versioned key', () => {
    saveTransactions(sample)
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })

  it('returns [] for corrupt JSON without crashing', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json')
    expect(loadTransactions()).toEqual([])
  })

  it.each([['null'], ['42'], ['"text"'], ['[]'], ['{}'], ['{"transactions":"nope"}']])(
    'returns [] for valid JSON with the wrong shape: %s',
    (raw) => {
      localStorage.setItem(STORAGE_KEY, raw)
      expect(loadTransactions()).toEqual([])
    },
  )
})
