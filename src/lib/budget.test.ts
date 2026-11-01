import { describe, expect, it } from 'vitest'
import { makeTransaction } from '../test/factories'
import { budgetLevel, budgetProgress, setBudget } from './budget'

describe('budgetLevel', () => {
  it.each([
    [0, 100000, 'ok'],
    [79999, 100000, 'ok'],
    [80000, 100000, 'near'], // exactly 80%
    [100000, 100000, 'near'], // exactly at the limit is not over yet
    [100001, 100000, 'over'],
    [3, 3, 'near'],
    [2, 3, 'ok'], // 66%
  ])('%i spent of %i → %s', (spent, limit, level) => {
    expect(budgetLevel(spent, limit)).toBe(level)
  })
})

describe('budgetProgress', () => {
  const transactions = [
    makeTransaction({ categoryId: 'groceries', amountAgorot: 60000 }),
    makeTransaction({ categoryId: 'groceries', amountAgorot: 30000 }),
    makeTransaction({ categoryId: 'bills', amountAgorot: 10000 }),
    makeTransaction({ type: 'income', categoryId: 'groceries', amountAgorot: 999999 }), // income never counts
  ]

  it('sums expenses per budget and sorts by how much of the limit is used', () => {
    const progress = budgetProgress(transactions, [
      { categoryId: 'bills', limitAgorot: 50000 },
      { categoryId: 'groceries', limitAgorot: 100000 },
      { categoryId: 'health', limitAgorot: 20000 },
    ])

    expect(progress).toEqual([
      { categoryId: 'groceries', limit: 100000, spent: 90000, remaining: 10000, percent: 90, level: 'near' },
      { categoryId: 'bills', limit: 50000, spent: 10000, remaining: 40000, percent: 20, level: 'ok' },
      { categoryId: 'health', limit: 20000, spent: 0, remaining: 20000, percent: 0, level: 'ok' },
    ])
  })

  it('reports a negative remaining amount and >100% when over', () => {
    const [food] = budgetProgress(transactions, [{ categoryId: 'groceries', limitAgorot: 60000 }])
    expect(food).toMatchObject({ remaining: -30000, percent: 150, level: 'over' })
  })

  it('returns nothing without budgets', () => {
    expect(budgetProgress(transactions, [])).toEqual([])
  })
})

describe('setBudget', () => {
  it('adds, replaces and removes a budget', () => {
    const added = setBudget([], 'groceries', 1000)
    expect(added).toEqual([{ categoryId: 'groceries', limitAgorot: 1000 }])
    expect(setBudget(added, 'groceries', 2000)).toEqual([{ categoryId: 'groceries', limitAgorot: 2000 }])
    expect(setBudget(added, 'groceries', null)).toEqual([])
  })
})
