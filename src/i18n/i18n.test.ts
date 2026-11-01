import { describe, expect, it } from 'vitest'
import { createI18n } from './i18n'
import { format, messages } from './messages'

describe('format', () => {
  it('fills placeholders and leaves unknown ones', () => {
    expect(format('{a} and {b}', { a: 1 })).toBe('1 and {b}')
  })
})

describe('messages', () => {
  it('has the same keys in every language, none empty', () => {
    const heKeys = Object.keys(messages.he).sort()
    expect(Object.keys(messages.en).sort()).toEqual(heKeys)
    for (const dictionary of Object.values(messages)) {
      expect(Object.values(dictionary).every((value) => value.trim() !== '')).toBe(true)
    }
  })
})

describe('createI18n', () => {
  it('sets direction and locale per language', () => {
    expect(createI18n('he')).toMatchObject({ dir: 'rtl', locale: 'he-IL' })
    expect(createI18n('en')).toMatchObject({ dir: 'ltr', locale: 'en-US' })
  })

  it('translates default category names until they are renamed', () => {
    const en = createI18n('en')
    expect(en.categoryName({ id: 'food', name: 'אוכל', type: 'expense' })).toBe('Food')
    expect(en.categoryName({ id: 'food', name: 'סופר', type: 'expense' })).toBe('סופר')
    expect(en.categoryName({ id: 'pets', name: 'Pets', type: 'expense' })).toBe('Pets')
    expect(createI18n('he').categoryName({ id: 'food', name: 'אוכל', type: 'expense' })).toBe('אוכל')
    expect(en.categoryName(undefined)).toBe('No category')
  })
})
