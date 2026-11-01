// The entry screen: one line of free text ("שכ״ד 4000") becomes a transaction.
import { UNCATEGORIZED_ID } from '../data/defaultCategories'
import { parseAmount } from './money'
import type { AppData, Category, NoteRule, Transaction } from './types'

export type ParsedEntry = { ok: true; amountAgorot: number; note: string } | { ok: false; error: 'no-amount' | 'bad-amount' }

// A run of digits, maybe with thousands commas or a decimal point ("4000", "1,200", "18.5").
const NUMBER_TOKEN = /\d[\d.,]*/g
// Currency words and signs that aren't part of the note.
const CURRENCY = /₪|(?<![\p{L}\d])(?:ש["״]?ח|שקל(?:ים)?|nis|ils)(?![\p{L}\d])/giu

/**
 * Splits one line into an amount and a note. The amount is the last number in the line, and
 * everything else is the note: "שכ״ד4000" → 4000 + "שכ״ד", "רב קו 2 50" → 50 + "רב קו 2".
 */
export function parseEntry(text: string): ParsedEntry {
  const tokens = [...text.matchAll(NUMBER_TOKEN)]
  const last = tokens.at(-1)
  if (!last) return { ok: false, error: 'no-amount' }

  // A trailing dot or comma belongs to the sentence, not to the number ("קפה 18.").
  const token = last[0].replace(/[.,]+$/, '')
  const amountAgorot = parseAmount(token)
  if (amountAgorot === null) return { ok: false, error: 'bad-amount' }

  const start = last.index
  const rest = text.slice(0, start) + ' ' + text.slice(start + token.length)
  const note = rest
    .replace(CURRENCY, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s:,.\-–]+|[\s:,.\-–]+$/g, '')
  return { ok: true, amountAgorot, note }
}

/** For matching notes: case, extra spaces and quote marks don't matter ("שכ״ד" = "שכ\"ד" = "שכד"). */
export function normalizeNote(note: string): string {
  return note
    .replace(/["'`״׳]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase()
}

const SALARY_WORD = 'משכורת'
const SALARY_ID = 'salary'

/**
 * The category for a new entry: a learned rule for the same note, then the word "משכורת" (salary,
 * as income), otherwise none yet. A rule or category that no longer exists is ignored.
 */
export function guessCategory(note: string, rules: NoteRule[], categories: Category[]): Category | undefined {
  const key = normalizeNote(note)
  if (!key) return undefined
  const learned = rules.find((r) => r.note === key)
  const fromRule = learned && categories.find((c) => c.id === learned.categoryId)
  if (fromRule) return fromRule
  if (key.includes(SALARY_WORD)) return categories.find((c) => c.id === SALARY_ID && c.type === 'income')
  return undefined
}

/** The transaction for a parsed entry, dated today. With no category it's an uncategorized expense. */
export function createEntry(
  entry: { amountAgorot: number; note: string },
  data: Pick<AppData, 'noteRules' | 'categories'>,
  id: string,
  date: string,
  createdAt: string,
): Transaction {
  const category = guessCategory(entry.note, data.noteRules, data.categories)
  return {
    id,
    type: category?.type ?? 'expense',
    amountAgorot: entry.amountAgorot,
    categoryId: category?.id ?? UNCATEGORIZED_ID,
    date,
    ...(entry.note && { note: entry.note }),
    createdAt,
  }
}

export function isUncategorized(transaction: Transaction): boolean {
  return transaction.categoryId === UNCATEGORIZED_ID
}

/** Remembers that this note means this category (replacing an older rule for the same note). */
export function learnRule(rules: NoteRule[], note: string | undefined, categoryId: string): NoteRule[] {
  const key = normalizeNote(note ?? '')
  if (!key || categoryId === UNCATEGORIZED_ID) return rules
  return [...rules.filter((r) => r.note !== key), { note: key, categoryId }]
}

/**
 * Sorts one uncategorized transaction into a category, and every other uncategorized one with the
 * same note too, and learns the note. The type follows the category (an income category makes it income).
 * Returns the new data and the transactions as they were before, for undo.
 */
export function assignCategory(
  data: AppData,
  transactionId: string,
  categoryId: string,
): { data: AppData; before: Transaction[] } {
  const target = data.transactions.find((t) => t.id === transactionId)
  const category = data.categories.find((c) => c.id === categoryId)
  if (!target || !category) return { data, before: [] }

  const key = normalizeNote(target.note ?? '')
  const matches = (t: Transaction) =>
    t.id === target.id || (key !== '' && isUncategorized(t) && normalizeNote(t.note ?? '') === key)

  const before = data.transactions.filter(matches)
  return {
    data: {
      ...data,
      transactions: data.transactions.map((t) => (matches(t) ? { ...t, categoryId, type: category.type } : t)),
      noteRules: learnRule(data.noteRules, target.note, categoryId),
    },
    before,
  }
}

/** Puts transactions back as they were (undo of assignCategory) and restores the rules. */
export function restoreTransactions(data: AppData, before: Transaction[], noteRules: NoteRule[]): AppData {
  const byId = new Map(before.map((t) => [t.id, t]))
  return {
    ...data,
    transactions: data.transactions.map((t) => byId.get(t.id) ?? t),
    noteRules,
  }
}

/** Uncategorized transactions, oldest entry first (the order the sort screen goes through them). */
export function uncategorizedQueue(transactions: Transaction[]): Transaction[] {
  return transactions.filter(isUncategorized).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** The most recently entered transactions, newest first. */
export function recentEntries(transactions: Transaction[], count: number): Transaction[] {
  return [...transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, count)
}
