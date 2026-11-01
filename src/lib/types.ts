import type { CategoryColor } from './colors'

export type TransactionType = 'income' | 'expense'

export interface Category {
  id: string
  name: string // display name, as the user typed it (default categories start in Hebrew)
  type: TransactionType
  color?: CategoryColor
  icon?: string // a short emoji
}

export interface Transaction {
  id: string
  type: TransactionType
  amountAgorot: number // positive integer
  categoryId: string
  date: string // ISO date, YYYY-MM-DD
  note?: string
  createdAt: string // ISO timestamp
  recurringId?: string // set when generated from a RecurringRule
}

/** A month in the form YYYY-MM */
export type MonthKey = string

/** A monthly item (rent, salary, subscription) that creates one transaction per month. */
export interface RecurringRule {
  id: string
  type: TransactionType
  amountAgorot: number
  categoryId: string
  dayOfMonth: number // 1–31; clamped to the length of shorter months
  note?: string
  startMonth: MonthKey
  lastGeneratedMonth?: MonthKey // the latest month a transaction was created for
  active: boolean
  createdAt: string
}

/** Monthly spending limit for one expense category. */
export interface Budget {
  categoryId: string
  limitAgorot: number // positive integer
}

export type ThemeSetting = 'system' | 'light' | 'dark'
export type Language = 'he' | 'en'

export interface Settings {
  theme: ThemeSetting
  language: Language
  /** Last category used per type, for quick add and as the form's default. */
  lastCategoryId: Partial<Record<TransactionType, string>>
}

/** A learned match: an entry whose note is `note` (normalized) gets `categoryId`. */
export interface NoteRule {
  note: string // normalized with normalizeNote()
  categoryId: string
}

/** Everything the app stores. */
export interface AppData {
  transactions: Transaction[]
  categories: Category[]
  recurring: RecurringRule[]
  budgets: Budget[]
  noteRules: NoteRule[]
  settings: Settings
}
