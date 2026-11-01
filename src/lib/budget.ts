import type { Budget, Transaction } from './types'

export type BudgetLevel = 'ok' | 'near' | 'over'

/** "Near" starts at 80% of the limit. */
export const NEAR_LIMIT_PERCENT = 80

/** Integer math only: near when spent ≥ 80% of the limit, over when spent is more than the limit. */
export function budgetLevel(spentAgorot: number, limitAgorot: number): BudgetLevel {
  if (spentAgorot > limitAgorot) return 'over'
  if (spentAgorot * 100 >= limitAgorot * NEAR_LIMIT_PERCENT) return 'near'
  return 'ok'
}

export interface BudgetProgress {
  categoryId: string
  limit: number // agorot
  spent: number // agorot
  remaining: number // agorot, negative when over
  percent: number // spent as a whole percent of the limit (can be above 100)
  level: BudgetLevel
}

/** Progress of every budget for the given (already month-filtered) transactions; most used first. */
export function budgetProgress(monthTransactions: Transaction[], budgets: Budget[]): BudgetProgress[] {
  return budgets
    .map((b) => {
      const spent = monthTransactions
        .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId)
        .reduce((sum, t) => sum + t.amountAgorot, 0)
      return {
        categoryId: b.categoryId,
        limit: b.limitAgorot,
        spent,
        remaining: b.limitAgorot - spent,
        percent: Math.floor((spent * 100) / b.limitAgorot),
        level: budgetLevel(spent, b.limitAgorot),
      }
    })
    .sort((a, b) => b.spent * a.limit - a.spent * b.limit) // by spent/limit, without division
}

/** Sets (or with null, removes) the budget of one category. */
export function setBudget(budgets: Budget[], categoryId: string, limitAgorot: number | null): Budget[] {
  const others = budgets.filter((b) => b.categoryId !== categoryId)
  return limitAgorot === null ? others : [...others, { categoryId, limitAgorot }]
}
