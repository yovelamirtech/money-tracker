import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { createDefaultAppData } from './lib/appData'
import { addMonths, todayISO, toMonthKey } from './lib/month'
import { loadData, saveData } from './lib/storage'
import type { AppData } from './lib/types'
import { makeRule, makeTransaction } from './test/factories'

const today = todayISO()
const thisMonth = toMonthKey(today)

function seed(changes: Partial<AppData>) {
  saveData({ ...createDefaultAppData(), ...changes })
}

function summaryValue(label: string) {
  return within(screen.getByRole('group', { name: label }))
}

afterEach(() => {
  vi.restoreAllMocks()
  document.documentElement.className = ''
  document.documentElement.lang = 'he'
  document.documentElement.dir = 'rtl'
})

describe('edit transaction (2.1)', () => {
  it('opens a transaction, changes every field and saves it in place', async () => {
    const user = userEvent.setup()
    seed({ transactions: [makeTransaction({ id: 'x', amountAgorot: 1250, categoryId: 'groceries', date: today, note: 'פלאפל' })] })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'חודש' }))

    await user.click(screen.getByRole('button', { name: /^עריכת\s*סופר/ }))
    expect(screen.getByRole('heading', { name: 'עריכת תנועה' })).toBeInTheDocument()
    expect(screen.getByLabelText('סכום (₪)')).toHaveValue('12.50')
    expect(screen.getByLabelText('הערה (לא חובה)')).toHaveValue('פלאפל')
    expect(screen.queryByLabelText(/חוזר כל חודש/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'הכנסה' }))
    await user.clear(screen.getByLabelText('סכום (₪)'))
    await user.type(screen.getByLabelText('סכום (₪)'), '99')
    await user.clear(screen.getByLabelText('הערה (לא חובה)'))
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    const [saved] = loadData().transactions
    expect(saved).toMatchObject({ id: 'x', type: 'income', amountAgorot: 9900, categoryId: 'salary', date: today })
    expect(saved).not.toHaveProperty('note')
    expect(summaryValue('הכנסות').getByText('₪99.00')).toBeInTheDocument()
    expect(summaryValue('הוצאות').getByText('₪0.00')).toBeInTheDocument()
  })

  it('uses the same validation as adding', async () => {
    const user = userEvent.setup()
    seed({ transactions: [makeTransaction({ id: 'x', date: today })] })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'חודש' }))

    await user.click(screen.getByRole('button', { name: /^עריכת\s*סופר/ }))
    await user.clear(screen.getByLabelText('סכום (₪)'))
    await user.type(screen.getByLabelText('סכום (₪)'), '1.234')
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(loadData().transactions[0].amountAgorot).toBe(1000)
  })
})

describe('sort screen', () => {
  const entry = (id: string, note: string | undefined, createdAt: string) =>
    makeTransaction({ id, categoryId: 'uncategorized', date: today, createdAt, ...(note && { note }) })

  it('goes through the uncategorized entries oldest first; same note sorts together; undo; income', async () => {
    const user = userEvent.setup()
    seed({
      transactions: [
        entry('a', 'קפה', '2026-10-01T08:00:00Z'),
        entry('b', 'החזר מס', '2026-10-02T08:00:00Z'),
        entry('c', 'קפה', '2026-10-03T08:00:00Z'),
      ],
    })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'מיון 3 ללא קטגוריה' }))
    expect(screen.getByText('נשארו 3')).toBeInTheDocument()
    expect(screen.getByText('קפה')).toBeInTheDocument()

    // Both "קפה" entries are sorted with one tap
    await user.click(screen.getByRole('button', { name: 'אוכל בחוץ' }))
    expect(screen.getByRole('status')).toHaveTextContent('"קפה" ← אוכל בחוץ (ועוד 1 עם אותו שם)')
    expect(screen.getByText('נשארו 1')).toBeInTheDocument()
    expect(loadData().transactions.map((t) => t.categoryId)).toEqual(['eating-out', 'uncategorized', 'eating-out'])

    // Undo brings them back, and forgets the rule
    await user.click(screen.getByRole('button', { name: 'ביטול' }))
    expect(loadData().transactions.map((t) => t.categoryId)).toEqual(['uncategorized', 'uncategorized', 'uncategorized'])
    expect(loadData().noteRules).toEqual([])
    expect(screen.getByText('נשארו 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'אוכל בחוץ' }))

    // An income category turns it into income (they're folded away until asked for)
    expect(screen.getByText('החזר מס')).toBeInTheDocument()
    await user.click(screen.getByText('זו בעצם הכנסה?'))
    const income = screen.getByRole('region', { name: 'זו בעצם הכנסה?' })
    await user.click(within(income).getByRole('button', { name: 'אחר' }))
    expect(loadData().transactions[1]).toMatchObject({ type: 'income', categoryId: 'other-income' })
    expect(screen.getByText('הכול ממוין')).toBeInTheDocument()
  })

  it('skips an entry and can go over the skipped ones again', async () => {
    const user = userEvent.setup()
    seed({ transactions: [entry('a', undefined, '2026-10-01T08:00:00Z'), entry('b', 'דלק', '2026-10-02T08:00:00Z')] })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'מיון 2 ללא קטגוריה' }))

    expect(screen.getByText('בלי תיאור')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'דלג' }))
    await user.click(screen.getByRole('button', { name: 'רכב' }))
    expect(screen.getByText('סיימת. נשארו 1 שדילגת עליהן.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'לעבור שוב על מה שדילגתי' }))
    expect(screen.getByText('בלי תיאור')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'חזרה' }))
    expect(screen.getByRole('button', { name: 'מיון 1 ללא קטגוריה' })).toBeInTheDocument()
  })
})

describe('recurring transactions (2.4)', () => {
  it('generates the missing months when the app opens, without duplicates', () => {
    const start = addMonths(thisMonth, -2)
    seed({ recurring: [makeRule({ id: 'rent', startMonth: start, lastGeneratedMonth: start })] })

    const { unmount } = render(<App />)
    expect(loadData().transactions.map((t) => toMonthKey(t.date))).toEqual([addMonths(thisMonth, -1), thisMonth])
    // The latest entries list shows both generated months
    expect(screen.getAllByRole('img', { name: 'חוזר כל חודש' })).toHaveLength(2)

    unmount()
    render(<App />)
    expect(loadData().transactions).toHaveLength(2)
  })

  it('"repeat every month" creates a rule; pause and delete it from settings', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)

    await user.click(screen.getByRole('button', { name: /הוספה מפורטת/ }))
    await user.type(screen.getByLabelText('סכום (₪)'), '49.90')
    await user.selectOptions(screen.getByLabelText('קטגוריה'), 'בריאות')
    await user.click(screen.getByLabelText(/חוזר כל חודש/))
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    const data = loadData()
    expect(data.recurring).toHaveLength(1)
    expect(data.transactions).toHaveLength(1)
    expect(data.transactions[0].recurringId).toBe(data.recurring[0].id)

    await user.click(screen.getByRole('button', { name: 'הגדרות' }))
    await user.click(screen.getByRole('button', { name: /תנועות קבועות/ }))
    expect(screen.getByText(`בכל ${Number(today.slice(8))} בחודש`)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'השהיה של בריאות' }))
    expect(loadData().recurring[0].active).toBe(false)
    expect(screen.getByText(/מושהה/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'חידוש של בריאות' }))
    expect(loadData().recurring[0].active).toBe(true)

    await user.click(screen.getByRole('button', { name: 'מחיקת התנועה הקבועה בריאות' }))
    expect(loadData().recurring).toEqual([])
    expect(loadData().transactions).toHaveLength(1)
    expect(screen.getByText(/אין תנועות קבועות/)).toBeInTheDocument()
  })
})

describe('manage categories (2.2)', () => {
  it('adds, renames and deletes a category; its transactions move to "אחר"', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'הגדרות' }))
    await user.click(screen.getByRole('button', { name: /קטגוריות/ }))

    // Add
    await user.type(screen.getByLabelText('שם'), 'חיות')
    await user.type(screen.getByLabelText('אימוג׳י (רשות)'), '🐶')
    await user.click(screen.getByRole('radio', { name: 'ירוק' }))
    await user.click(screen.getByRole('button', { name: 'הוספת קטגוריה' }))
    const pets = loadData().categories.find((c) => c.name === 'חיות')
    expect(pets).toMatchObject({ type: 'expense', icon: '🐶', color: 'green' })

    // Duplicate names are rejected
    await user.type(screen.getByLabelText('שם'), 'סופר')
    await user.click(screen.getByRole('button', { name: 'הוספת קטגוריה' }))
    expect(screen.getByRole('alert')).toHaveTextContent('כבר יש קטגוריה בשם הזה')
    await user.clear(screen.getByLabelText('שם'))

    // Rename
    await user.click(screen.getByRole('button', { name: 'עריכת חיות' }))
    const list = screen.getByRole('list', { name: 'קטגוריות' })
    const nameField = within(list).getByLabelText('שם')
    await user.clear(nameField)
    await user.type(nameField, 'חיות מחמד')
    await user.click(within(list).getByRole('button', { name: 'שמירה' }))
    expect(loadData().categories.find((c) => c.id === pets?.id)?.name).toBe('חיות מחמד')

    // Use it, then delete it
    saveData({ ...loadData(), transactions: [makeTransaction({ id: 'p', categoryId: pets?.id ?? '' })] })
    expect(within(list).queryByRole('button', { name: 'מחיקת אחר' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'מחיקת חיות מחמד' }))
    expect(window.confirm).toHaveBeenCalled()
    expect(loadData().categories.some((c) => c.id === pets?.id)).toBe(false)
  })

  it('moves the transactions of a deleted category to "אחר"', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    seed({ transactions: [makeTransaction({ id: 'a', categoryId: 'health', date: today })] })
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'הגדרות' }))
    await user.click(screen.getByRole('button', { name: /קטגוריות/ }))
    await user.click(screen.getByRole('button', { name: 'מחיקת בריאות' }))
    expect(window.confirm).toHaveBeenCalledWith('למחוק את הקטגוריה "בריאות"? 1 תנועות יעברו ל"אחר".')
    expect(loadData().transactions[0].categoryId).toBe('other-expense')
  })
})

describe('budgets (3.3)', () => {
  it('sets budgets and warns on the month screen when near or over', async () => {
    const user = userEvent.setup()
    seed({
      transactions: [
        makeTransaction({ categoryId: 'groceries', amountAgorot: 90000, date: today }),
        makeTransaction({ categoryId: 'bills', amountAgorot: 70000, date: today }),
      ],
    })
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'הגדרות' }))
    await user.click(screen.getByRole('button', { name: /תקציבים/ }))
    await user.type(screen.getByLabelText('תקציב לסופר (₪)'), '1,000')
    await user.type(screen.getByLabelText('תקציב לחשבונות (₪)'), '500')
    await user.type(screen.getByLabelText('תקציב לבריאות (₪)'), 'abc')
    await user.click(screen.getByRole('button', { name: 'שמירה' }))
    expect(screen.getByText('סכום לא תקין')).toBeInTheDocument()
    expect(loadData().budgets).toEqual([])

    await user.clear(screen.getByLabelText('תקציב לבריאות (₪)'))
    await user.click(screen.getByRole('button', { name: 'שמירה' }))
    expect(screen.getByRole('status')).toHaveTextContent('התקציבים נשמרו')
    expect(loadData().budgets).toEqual([
      { categoryId: 'bills', limitAgorot: 50000 },
      { categoryId: 'groceries', limitAgorot: 100000 },
    ])

    await user.click(screen.getByRole('button', { name: 'חודש' }))
    expect(screen.getByText('חריגה מהתקציב: חשבונות')).toBeInTheDocument()
    expect(screen.getByText('קרוב לגבול התקציב: סופר')).toBeInTheDocument()
  })
})

describe('month screen: summary and insights (3.1–3.5)', () => {
  it('shows spending, income only when entered, by category, budgets, changes from last month and the trend', async () => {
    const user = userEvent.setup()
    const lastMonth = `${addMonths(thisMonth, -1)}-10`
    seed({
      transactions: [
        makeTransaction({ type: 'income', categoryId: 'salary', amountAgorot: 1000000, date: today }),
        makeTransaction({ categoryId: 'car', amountAgorot: 450000, date: today }),
        makeTransaction({ categoryId: 'groceries', amountAgorot: 150000, date: today }),
        makeTransaction({ categoryId: 'groceries', amountAgorot: 100000, date: lastMonth }),
      ],
      budgets: [{ categoryId: 'groceries', limitAgorot: 100000 }],
    })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'חודש' }))

    expect(summaryValue('הוצאות').getByText('₪6,000.00')).toBeInTheDocument()
    expect(summaryValue('הכנסות').getByText('₪10,000.00')).toBeInTheDocument()
    expect(summaryValue('נשאר').getByText('₪4,000.00')).toBeInTheDocument()

    const bars = within(screen.getByRole('list', { name: 'הוצאות לפי קטגוריה' })).getAllByRole('listitem')
    expect(bars.map((li) => li.textContent)).toEqual([
      expect.stringContaining('רכב'),
      expect.stringContaining('סופר'),
    ])
    expect(bars[0]).toHaveTextContent('₪4,500.00 · 75%')

    expect(screen.getByRole('progressbar', { name: 'סופר' })).toHaveAttribute('aria-valuetext', '150%')
    expect(screen.getByText('חריגה של ₪500.00')).toBeInTheDocument()

    expect(screen.getByText('עלייה של ₪4,500.00')).toBeInTheDocument()
    expect(screen.getByText('עלייה של ₪500.00')).toBeInTheDocument()

    expect(screen.getByRole('img', { name: 'הוצאות לאורך זמן' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '12 חודשים' }))
    const trendRows = screen.getAllByRole('table')[1].querySelectorAll('tbody tr')
    expect(trendRows).toHaveLength(12)
  })

  it('shows empty states for a month without data', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'חודש' }))
    expect(screen.getByText('אין תנועות בחודש הזה')).toBeInTheDocument()
    expect(screen.getByText('אין הוצאות בחודש הזה')).toBeInTheDocument()
    expect(screen.getByText('עוד לא הוגדרו תקציבים.')).toBeInTheDocument()
    expect(screen.getByText('אין שינוי בהוצאות לעומת החודש הקודם.')).toBeInTheDocument()
    // No income entered: only spending is shown
    expect(summaryValue('הוצאות').getByText('₪0.00')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'הכנסות' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'נשאר' })).not.toBeInTheDocument()
  })
})

describe('search and filter (2.3)', () => {
  it('filters by note text, type, category and amount range', async () => {
    const user = userEvent.setup()
    seed({
      transactions: [
        makeTransaction({ id: 'a', categoryId: 'groceries', amountAgorot: 1500, note: 'קפה', date: '2025-01-05' }),
        makeTransaction({ id: 'b', categoryId: 'groceries', amountAgorot: 40000, note: 'סופר', date: '2026-03-01' }),
        makeTransaction({ id: 'c', type: 'income', categoryId: 'salary', amountAgorot: 900000, date: '2026-03-01' }),
      ],
    })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'חיפוש' }))

    const results = () => screen.queryByRole('list', { name: 'תוצאות חיפוש' })
    expect(within(results() as HTMLElement).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText('05.01.2025 · קפה')).toBeInTheDocument()

    await user.type(screen.getByLabelText('חיפוש בהערות'), 'סופר')
    expect(within(results() as HTMLElement).getAllByRole('listitem')).toHaveLength(1)
    await user.clear(screen.getByLabelText('חיפוש בהערות'))

    await user.selectOptions(screen.getByLabelText('סוג'), 'income')
    expect(screen.getByText('1 תוצאות')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('סוג'), 'all')

    await user.selectOptions(screen.getByLabelText('קטגוריה'), 'groceries')
    await user.type(screen.getByLabelText('מסכום (₪)'), '100')
    expect(screen.getByText('1 תוצאות')).toBeInTheDocument()
    expect(within(results() as HTMLElement).getByText(/· סופר/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('עד סכום (₪)'), 'x')
    expect(screen.getByText('סכום לא תקין')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'ניקוי סינון' }))
    expect(screen.getByText('3 תוצאות')).toBeInTheDocument()

    await user.type(screen.getByLabelText('חיפוש בהערות'), 'nothing here')
    expect(results()).not.toBeInTheDocument()
    expect(screen.getByText('לא נמצאו תנועות')).toBeInTheDocument()
  })

  it('edits a result and comes back to search', async () => {
    const user = userEvent.setup()
    seed({ transactions: [makeTransaction({ categoryId: 'groceries', note: 'קפה', date: '2025-01-05' })] })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'חיפוש' }))
    await user.click(screen.getByRole('button', { name: /^עריכת\s*סופר/ }))
    await user.click(screen.getByRole('button', { name: 'ביטול' }))
    expect(screen.getByRole('heading', { name: 'חיפוש וסינון' })).toBeInTheDocument()
  })
})

describe('appearance and language (4.4, 4.8)', () => {
  it('switches to dark mode and back to light', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'הגדרות' }))
    await user.click(screen.getByRole('button', { name: 'כהה' }))
    expect(document.documentElement).toHaveClass('dark')
    expect(loadData().settings.theme).toBe('dark')
    await user.click(screen.getByRole('button', { name: 'בהיר' }))
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('follows the system setting by default', () => {
    // jsdom has no matchMedia, so provide one that reports a dark device.
    const query = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }
    vi.stubGlobal('matchMedia', vi.fn(() => query))
    render(<App />)
    expect(document.documentElement).toHaveClass('dark')
    vi.unstubAllGlobals()
  })

  it('switches to English with left-to-right layout and translated categories', async () => {
    const user = userEvent.setup()
    seed({ transactions: [makeTransaction({ categoryId: 'groceries', date: today })] })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'הגדרות' }))
    await user.click(screen.getByRole('button', { name: 'English' }))

    expect(document.documentElement).toHaveAttribute('dir', 'ltr')
    expect(document.documentElement).toHaveAttribute('lang', 'en')
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Month' }))
    expect(within(screen.getByRole('list', { name: 'Transactions' })).getByText('Groceries')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: 'עברית' }))
    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
  })
})
