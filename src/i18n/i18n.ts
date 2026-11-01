import { createContext, useContext } from 'react'
import { defaultCategories } from '../data/defaultCategories'
import type { Category, Language } from '../lib/types'
import { defaultCategoryNamesEn, format, messages, type MessageKey } from './messages'

export interface I18n {
  lang: Language
  locale: string // for Intl formatters
  dir: 'rtl' | 'ltr'
  t: (key: MessageKey, params?: Record<string, string | number>) => string
  /** Display name of a category in the current language (undefined → "no category"). */
  categoryName: (category: Category | undefined) => string
}

const defaultHebrewNames = new Map(defaultCategories.map((c) => [c.id, c.name]))

export function createI18n(lang: Language): I18n {
  const dictionary = messages[lang]
  const t: I18n['t'] = (key, params) => format(dictionary[key], params)

  return {
    lang,
    locale: lang === 'he' ? 'he-IL' : 'en-US',
    dir: lang === 'he' ? 'rtl' : 'ltr',
    t,
    categoryName(category) {
      if (!category) return t('uncategorized')
      // Default categories are translated until the user renames them.
      const english = defaultCategoryNamesEn[category.id]
      if (lang === 'en' && english && defaultHebrewNames.get(category.id) === category.name) return english
      return category.name
    },
  }
}

export const I18nContext = createContext<I18n>(createI18n('he'))

export function useI18n(): I18n {
  return useContext(I18nContext)
}
