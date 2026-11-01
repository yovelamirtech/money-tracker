import { addMonths, daysInMonth, pad2, toMonthKey } from './month'
import type { MonthKey, RecurringRule, Transaction } from './types'

/** The date of a rule in a month; day 31 becomes the last day of shorter months. */
export function dateForMonth(dayOfMonth: number, month: MonthKey): string {
  return `${month}-${pad2(Math.min(dayOfMonth, daysInMonth(month)))}`
}

/**
 * A rule that repeats `transaction` every month. The transaction itself counts as the first
 * month, so generation continues from the month after it.
 */
export function createRuleFromTransaction(transaction: Transaction, ruleId: string): RecurringRule {
  const month = toMonthKey(transaction.date)
  return {
    id: ruleId,
    type: transaction.type,
    amountAgorot: transaction.amountAgorot,
    categoryId: transaction.categoryId,
    dayOfMonth: Number(transaction.date.slice(8, 10)),
    ...(transaction.note && { note: transaction.note }),
    startMonth: month,
    lastGeneratedMonth: month,
    active: true,
    createdAt: transaction.createdAt,
  }
}

export interface GenerateResult {
  rules: RecurringRule[]
  created: Transaction[]
}

/**
 * Creates the missing monthly transactions of every active rule, up to and including `upToMonth`.
 * Never creates two transactions for the same rule and month: it skips months up to
 * `lastGeneratedMonth` (so a deleted one doesn't come back) and months that already have one.
 */
export function generateRecurring(
  rules: RecurringRule[],
  transactions: Transaction[],
  upToMonth: MonthKey,
  createdAt: string,
  createId: () => string,
): GenerateResult {
  const existing = new Set(
    transactions.filter((t) => t.recurringId).map((t) => `${t.recurringId}|${toMonthKey(t.date)}`),
  )
  const created: Transaction[] = []

  const nextRules = rules.map((rule) => {
    if (!rule.active) return rule
    const from = rule.lastGeneratedMonth ? addMonths(rule.lastGeneratedMonth, 1) : rule.startMonth
    if (from > upToMonth) return rule

    for (let month = from; month <= upToMonth; month = addMonths(month, 1)) {
      if (existing.has(`${rule.id}|${month}`)) continue
      created.push({
        id: createId(),
        type: rule.type,
        amountAgorot: rule.amountAgorot,
        categoryId: rule.categoryId,
        date: dateForMonth(rule.dayOfMonth, month),
        ...(rule.note && { note: rule.note }),
        createdAt,
        recurringId: rule.id,
      })
    }
    return { ...rule, lastGeneratedMonth: upToMonth }
  })

  return { rules: nextRules, created }
}

export function pauseRule(rule: RecurringRule): RecurringRule {
  return { ...rule, active: false }
}

/**
 * Resumes a paused rule from the current month on: months missed while it was paused
 * are not filled in after the fact.
 */
export function resumeRule(rule: RecurringRule, currentMonth: MonthKey): RecurringRule {
  const previous = addMonths(currentMonth, -1)
  const last = rule.lastGeneratedMonth && rule.lastGeneratedMonth > previous ? rule.lastGeneratedMonth : previous
  return { ...rule, active: true, lastGeneratedMonth: last < rule.startMonth ? undefined : last }
}
