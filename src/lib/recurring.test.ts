import { describe, expect, it } from 'vitest'
import { idSequence, makeRule, makeTransaction } from '../test/factories'
import { createDefaultAppData } from './appData'
import {
  applyRecurring,
  createRuleFromTransaction,
  dateForMonth,
  deleteRule,
  generateRecurring,
  pauseRule,
  resumeRule,
} from './recurring'

const NOW = '2026-11-01T08:00:00.000Z'

describe('dateForMonth', () => {
  it('uses the day of month, clamped to shorter months', () => {
    expect(dateForMonth(5, '2026-10')).toBe('2026-10-05')
    expect(dateForMonth(31, '2026-11')).toBe('2026-11-30')
    expect(dateForMonth(31, '2026-02')).toBe('2026-02-28')
    expect(dateForMonth(30, '2028-02')).toBe('2028-02-29')
  })
})

describe('createRuleFromTransaction', () => {
  it('copies the transaction and counts its month as already generated', () => {
    const t = makeTransaction({ amountAgorot: 4990, categoryId: 'subscriptions', date: '2026-10-17', note: 'נטפליקס' })
    expect(createRuleFromTransaction(t, 'r1')).toEqual({
      id: 'r1',
      type: 'expense',
      amountAgorot: 4990,
      categoryId: 'subscriptions',
      dayOfMonth: 17,
      note: 'נטפליקס',
      startMonth: '2026-10',
      lastGeneratedMonth: '2026-10',
      active: true,
      createdAt: t.createdAt,
    })
  })
})

describe('generateRecurring', () => {
  it('creates one transaction per month from the start month to now', () => {
    const rule = makeRule({ id: 'rent', startMonth: '2026-09', dayOfMonth: 31, note: 'שכירות' })
    const { created, rules } = generateRecurring([rule], [], '2026-11', NOW, idSequence())

    expect(created.map((t) => t.date)).toEqual(['2026-09-30', '2026-10-31', '2026-11-30'])
    expect(created[0]).toEqual({
      id: 'id-1',
      type: 'expense',
      amountAgorot: rule.amountAgorot,
      categoryId: 'housing',
      date: '2026-09-30',
      note: 'שכירות',
      createdAt: NOW,
      recurringId: 'rent',
    })
    expect(rules[0].lastGeneratedMonth).toBe('2026-11')
  })

  it('continues after the last generated month', () => {
    const rule = makeRule({ startMonth: '2026-01', lastGeneratedMonth: '2026-10' })
    const { created } = generateRecurring([rule], [], '2026-11', NOW, idSequence())
    expect(created.map((t) => t.date)).toEqual(['2026-11-01'])
  })

  it('is idempotent: running it twice creates nothing new', () => {
    const rule = makeRule({ startMonth: '2026-10' })
    const first = generateRecurring([rule], [], '2026-11', NOW, idSequence())
    const second = generateRecurring(first.rules, first.created, '2026-11', NOW, idSequence())
    expect(first.created).toHaveLength(2)
    expect(second.created).toEqual([])
  })

  it('does not duplicate a month that already has a transaction from the rule', () => {
    const rule = makeRule({ id: 'r', startMonth: '2026-10' })
    const existing = makeTransaction({ recurringId: 'r', date: '2026-10-01' })
    const { created } = generateRecurring([rule], [existing], '2026-11', NOW, idSequence())
    expect(created.map((t) => t.date)).toEqual(['2026-11-01'])
  })

  it('does not bring back a generated transaction the user deleted', () => {
    const rule = makeRule({ startMonth: '2026-10', lastGeneratedMonth: '2026-11' })
    expect(generateRecurring([rule], [], '2026-11', NOW, idSequence()).created).toEqual([])
  })

  it('crosses the year boundary', () => {
    const rule = makeRule({ startMonth: '2026-12' })
    const { created } = generateRecurring([rule], [], '2027-02', NOW, idSequence())
    expect(created.map((t) => t.date)).toEqual(['2026-12-01', '2027-01-01', '2027-02-01'])
  })

  it('skips paused rules and rules that start in the future', () => {
    const paused = makeRule({ active: false, startMonth: '2026-01' })
    const future = makeRule({ startMonth: '2027-01' })
    const result = generateRecurring([paused, future], [], '2026-11', NOW, idSequence())
    expect(result.created).toEqual([])
    expect(result.rules).toEqual([paused, future])
  })

  it('leaves out the note when the rule has none', () => {
    const { created } = generateRecurring([makeRule({ startMonth: '2026-11' })], [], '2026-11', NOW, idSequence())
    expect(created[0]).not.toHaveProperty('note')
  })
})

describe('pause / resume', () => {
  it('pausing stops generation', () => {
    expect(pauseRule(makeRule()).active).toBe(false)
  })

  it('resuming continues from the current month without filling the paused months', () => {
    const rule = makeRule({ active: false, startMonth: '2026-01', lastGeneratedMonth: '2026-06' })
    const resumed = resumeRule(rule, '2026-11')
    expect(resumed).toMatchObject({ active: true, lastGeneratedMonth: '2026-10' })
    expect(generateRecurring([resumed], [], '2026-11', NOW, idSequence()).created.map((t) => t.date)).toEqual([
      '2026-11-01',
    ])
  })

  it('resuming keeps a later last generated month', () => {
    const rule = makeRule({ active: false, lastGeneratedMonth: '2026-11' })
    expect(resumeRule(rule, '2026-11').lastGeneratedMonth).toBe('2026-11')
  })

  it('resuming a rule that has not started yet keeps its start month', () => {
    const rule = makeRule({ active: false, startMonth: '2027-03' })
    const resumed = resumeRule(rule, '2026-11')
    expect(resumed.lastGeneratedMonth).toBeUndefined()
    expect(generateRecurring([resumed], [], '2027-03', NOW, idSequence()).created).toHaveLength(1)
  })
})

describe('applyRecurring', () => {
  it('adds the created transactions and updated rules to the app data', () => {
    const data = { ...createDefaultAppData(), recurring: [makeRule({ startMonth: '2026-10' })] }
    const next = applyRecurring(data, '2026-11', NOW, idSequence())
    expect(next.transactions).toHaveLength(2)
    expect(next.recurring[0].lastGeneratedMonth).toBe('2026-11')
  })

  it('returns the same object when there is nothing to do', () => {
    const data = createDefaultAppData()
    expect(applyRecurring(data, '2026-11', NOW, idSequence())).toBe(data)
    const upToDate = { ...data, recurring: [makeRule({ startMonth: '2026-10', lastGeneratedMonth: '2026-11' })] }
    expect(applyRecurring(upToDate, '2026-11', NOW, idSequence())).toBe(upToDate)
  })
})

describe('deleteRule', () => {
  it('removes the rule and unmarks its transactions, keeping them', () => {
    const data = {
      ...createDefaultAppData(),
      recurring: [makeRule({ id: 'rent' }), makeRule({ id: 'gym' })],
      transactions: [makeTransaction({ id: 'a', recurringId: 'rent' }), makeTransaction({ id: 'b', recurringId: 'gym' })],
    }
    const next = deleteRule(data, 'rent')
    expect(next.recurring.map((r) => r.id)).toEqual(['gym'])
    expect(next.transactions).toHaveLength(2)
    expect(next.transactions[0]).not.toHaveProperty('recurringId')
    expect(next.transactions[1].recurringId).toBe('gym')
  })
})
