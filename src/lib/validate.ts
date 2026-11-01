// Runtime checks for data that comes from outside the app (localStorage, imported backups).
import { isCategoryColor } from './colors'
import type {
  Budget,
  Category,
  Language,
  RecurringRule,
  Settings,
  ThemeSetting,
  Transaction,
  TransactionType,
} from './types'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string'
}

export function isTransactionType(value: unknown): value is TransactionType {
  return value === 'income' || value === 'expense'
}

function isPositiveAgorot(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

/** A real calendar date in the form YYYY-MM-DD (rejects 2026-02-30). */
export function isISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export function isMonthKey(value: unknown): value is string {
  return typeof value === 'string' && MONTH_KEY.test(value)
}

export function isTransaction(value: unknown): value is Transaction {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isTransactionType(value.type) &&
    isPositiveAgorot(value.amountAgorot) &&
    isNonEmptyString(value.categoryId) &&
    isISODate(value.date) &&
    isOptionalString(value.note) &&
    typeof value.createdAt === 'string' &&
    isOptionalString(value.recurringId)
  )
}

export function isCategory(value: unknown): value is Category {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isTransactionType(value.type) &&
    (value.color === undefined || isCategoryColor(value.color)) &&
    isOptionalString(value.icon)
  )
}

export function isRecurringRule(value: unknown): value is RecurringRule {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isTransactionType(value.type) &&
    isPositiveAgorot(value.amountAgorot) &&
    isNonEmptyString(value.categoryId) &&
    typeof value.dayOfMonth === 'number' &&
    Number.isInteger(value.dayOfMonth) &&
    value.dayOfMonth >= 1 &&
    value.dayOfMonth <= 31 &&
    isOptionalString(value.note) &&
    isMonthKey(value.startMonth) &&
    (value.lastGeneratedMonth === undefined || isMonthKey(value.lastGeneratedMonth)) &&
    typeof value.active === 'boolean' &&
    typeof value.createdAt === 'string'
  )
}

export function isBudget(value: unknown): value is Budget {
  return isRecord(value) && isNonEmptyString(value.categoryId) && isPositiveAgorot(value.limitAgorot)
}

function isThemeSetting(value: unknown): value is ThemeSetting {
  return value === 'system' || value === 'light' || value === 'dark'
}

function isLanguage(value: unknown): value is Language {
  return value === 'he' || value === 'en'
}

export const defaultSettings: Settings = { theme: 'system', language: 'he', lastCategoryId: {} }

/** Settings are never worth rejecting data over: unknown or broken values fall back to defaults. */
export function parseSettings(value: unknown): Settings {
  if (!isRecord(value)) return { ...defaultSettings, lastCategoryId: {} }
  const last = isRecord(value.lastCategoryId) ? value.lastCategoryId : {}
  return {
    theme: isThemeSetting(value.theme) ? value.theme : defaultSettings.theme,
    language: isLanguage(value.language) ? value.language : defaultSettings.language,
    lastCategoryId: {
      ...(isNonEmptyString(last.income) && { income: last.income }),
      ...(isNonEmptyString(last.expense) && { expense: last.expense }),
    },
  }
}

/** Ids must be unique within a list. */
export function hasDuplicateIds(items: { id: string }[]): boolean {
  return new Set(items.map((item) => item.id)).size !== items.length
}
