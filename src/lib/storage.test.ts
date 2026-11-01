import { describe, expect, it, vi } from 'vitest'
import { createDefaultAppData } from './appData'
import { loadData, loadTransactions, saveData, saveTransactions, STORAGE_KEY } from './storage'
import type { AppData, Transaction } from './types'

const sample: Transaction[] = [
  {
    id: 'a',
    type: 'expense',
    amountAgorot: 1250,
    categoryId: 'groceries',
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

describe('loadData / saveData', () => {
  it('returns the default data when storage is empty', () => {
    expect(loadData()).toEqual(createDefaultAppData())
  })

  it('removes the old v1 data, which used the old categories', () => {
    localStorage.setItem('money-tracker:v1', JSON.stringify({ transactions: sample }))
    expect(loadData()).toEqual(createDefaultAppData())
    expect(localStorage.getItem('money-tracker:v1')).toBeNull()
  })

  it('save → load round-trip keeps every part', () => {
    const data: AppData = {
      ...createDefaultAppData(),
      transactions: sample,
      budgets: [{ categoryId: 'groceries', limitAgorot: 100000 }],
      noteRules: [{ note: 'קפה', categoryId: 'eating-out' }],
      settings: { theme: 'dark', language: 'en', lastCategoryId: { expense: 'groceries' } },
    }
    saveData(data)
    expect(loadData()).toEqual(data)
  })

  it('saveTransactions keeps the other stored parts', () => {
    saveData({ ...createDefaultAppData(), budgets: [{ categoryId: 'groceries', limitAgorot: 5 }] })
    saveTransactions(sample)
    expect(loadData().budgets).toEqual([{ categoryId: 'groceries', limitAgorot: 5 }])
    expect(loadData().transactions).toEqual(sample)
  })

  it('returns the default data for corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json')
    expect(loadData()).toEqual(createDefaultAppData())
  })

  it('does not crash when storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => saveData(createDefaultAppData())).not.toThrow()
    spy.mockRestore()
  })
})
