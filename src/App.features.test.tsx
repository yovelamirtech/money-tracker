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
    seed({ transactions: [makeTransaction({ id: 'x', amountAgorot: 1250, categoryId: 'food', date: today, note: 'פלאפל' })] })
    render(<App />)

    await user.click(screen.getByRole('button', { name: /^עריכת\s*אוכל/ }))
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

    await user.click(screen.getByRole('button', { name: /^עריכת\s*אוכל/ }))
    await user.clear(screen.getByLabelText('סכום (₪)'))
    await user.type(screen.getByLabelText('סכום (₪)'), '1.234')
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(loadData().transactions[0].amountAgorot).toBe(1000)
  })
})

describe('quick add (2.5)', () => {
  it('adds an expense dated today and remembers the category for next time', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    await user.selectOptions(screen.getByLabelText('קטגוריה להוספה מהירה'), 'bills')
    await user.type(screen.getByLabelText('סכום להוספה מהירה'), '250')
    await user.click(screen.getByRole('button', { name: 'הוספה' }))

    expect(screen.getByRole('status')).toHaveTextContent('נוסף: חשבונות ₪250.00')
    expect(screen.getByLabelText('סכום להוספה מהירה')).toHaveValue('')
    expect(loadData().transactions[0]).toMatchObject({ type: 'expense', amountAgorot: 25000, categoryId: 'bills', date: today })
    expect(summaryValue('הוצאות').getByText('₪250.00')).toBeInTheDocument()

    unmount()
    render(<App />)
    expect(screen.getByLabelText('קטגוריה להוספה מהירה')).toHaveValue('bills')
    await user.click(screen.getByRole('button', { name: '+ הוספת תנועה' }))
    expect(screen.getByLabelText('קטגוריה')).toHaveValue('bills')
  })

  it('rejects an invalid amount', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('סכום להוספה מהירה'), '0')
    await user.click(screen.getByRole('button', { name: 'הוספה' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(loadData().transactions).toEqual([])
  })
})

describe('recurring transactions (2.4)', () => {
  it('generates the missing months when the app opens, without duplicates', () => {
    const start = addMonths(thisMonth, -2)
    seed({ recurring: [makeRule({ id: 'rent', startMonth: start, lastGeneratedMonth: start })] })

    const { unmount } = render(<App />)
    expect(loadData().transactions.map((t) => toMonthKey(t.date))).toEqual([addMonths(thisMonth, -1), thisMonth])
    expect(screen.getByRole('img', { name: 'חוזר כל חודש' })).toBeInTheDocument()

    unmount()
    render(<App />)
    expect(loadData().transactions).toHaveLength(2)
  })

  it('"repeat every month" creates a rule; pause and delete it from settings', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)

    await user.click(screen.getByRole('button', { name: '+ הוספת תנועה' }))
    await user.type(screen.getByLabelText('סכום (₪)'), '49.90')
    await user.selectOptions(screen.getByLabelText('קטגוריה'), 'מנויים')
    await user.click(screen.getByLabelText(/חוזר כל חודש/))
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    const data = loadData()
    expect(data.recurring).toHaveLength(1)
    expect(data.transactions).toHaveLength(1)
    expect(data.transactions[0].recurringId).toBe(data.recurring[0].id)

    await user.click(screen.getByRole('button', { name: 'הגדרות' }))
    await user.click(screen.getByRole('button', { name: /תנועות קבועות/ }))
    expect(screen.getByText(`בכל ${Number(today.slice(8))} בחודש`)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'השהיה של מנויים' }))
    expect(loadData().recurring[0].active).toBe(false)
    expect(screen.getByText(/מושהה/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'חידוש של מנויים' }))
    expect(loadData().recurring[0].active).toBe(true)

    await user.click(screen.getByRole('button', { name: 'מחיקת התנועה הקבועה מנויים' }))
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
    await user.type(screen.getByLabelText('שם'), 'אוכל')
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
        makeTransaction({ categoryId: 'food', amountAgorot: 90000, date: today }),
        makeTransaction({ categoryId: 'bills', amountAgorot: 70000, date: today }),
      ],
    })
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'הגדרות' }))
    await user.click(screen.getByRole('button', { name: /תקציבים/ }))
    await user.type(screen.getByLabelText('תקציב לאוכל (₪)'), '1,000')
    await user.type(screen.getByLabelText('תקציב לחשבונות (₪)'), '500')
    await user.type(screen.getByLabelText('תקציב לבריאות (₪)'), 'abc')
    await user.click(screen.getByRole('button', { name: 'שמירה' }))
    expect(screen.getByText('סכום לא תקין')).toBeInTheDocument()
    expect(loadData().budgets).toEqual([])

    await user.clear(screen.getByLabelText('תקציב לבריאות (₪)'))
    await user.click(screen.getByRole('button', { name: 'שמירה' }))
    expect(screen.getByRole('status')).toHaveTextContent('התקציבים נשמרו')
    expect(loadData().budgets).toEqual([
      { categoryId: 'food', limitAgorot: 100000 },
      { categoryId: 'bills', limitAgorot: 50000 },
    ])

    await user.click(screen.getByRole('button', { name: 'חודש' }))
    expect(screen.getByText('חריגה מהתקציב: חשבונות')).toBeInTheDocument()
    expect(screen.getByText('קרוב לגבול התקציב: אוכל')).toBeInTheDocument()
  })
})

describe('insights (3.1–3.5)', () => {
  it('shows savings rate, spending by category, budgets, changes from last month and the trend', async () => {
    const user = userEvent.setup()
    const lastMonth = `${addMonths(thisMonth, -1)}-10`
    seed({
      transactions: [
        makeTransaction({ type: 'income', categoryId: 'salary', amountAgorot: 1000000, date: today }),
        makeTransaction({ categoryId: 'housing', amountAgorot: 450000, date: today }),
        makeTransaction({ categoryId: 'food', amountAgorot: 150000, date: today }),
        makeTransaction({ categoryId: 'food', amountAgorot: 100000, date: lastMonth }),
      ],
      budgets: [{ categoryId: 'food', limitAgorot: 100000 }],
    })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'תובנות' }))

    expect(screen.getByRole('heading', { name: 'שיעור חיסכון' }).parentElement).toHaveTextContent('40%')

    const bars = within(screen.getByRole('list', { name: 'הוצאות לפי קטגוריה' })).getAllByRole('listitem')
    expect(bars.map((li) => li.textContent)).toEqual([
      expect.stringContaining('דיור'),
      expect.stringContaining('אוכל'),
    ])
    expect(bars[0]).toHaveTextContent('₪4,500.00 · 75%')

    expect(screen.getByRole('progressbar', { name: 'אוכל' })).toHaveAttribute('aria-valuetext', '150%')
    expect(screen.getByText('חריגה של ₪500.00')).toBeInTheDocument()

    expect(screen.getByText('עלייה של ₪4,500.00')).toBeInTheDocument()
    expect(screen.getByText('עלייה של ₪500.00')).toBeInTheDocument()

    expect(screen.getByRole('img', { name: 'הכנסות מול הוצאות' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '12 חודשים' }))
    const trendRows = screen.getAllByRole('table')[1].querySelectorAll('tbody tr')
    expect(trendRows).toHaveLength(12)
  })

  it('shows empty states for a month without data', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'תובנות' }))
    expect(screen.getByText('אין הוצאות בחודש הזה')).toBeInTheDocument()
    expect(screen.getByText('עוד לא הוגדרו תקציבים.')).toBeInTheDocument()
    expect(screen.getByText('אין שינוי בהוצאות לעומת החודש הקודם.')).toBeInTheDocument()
    expect(screen.getAllByText('אין הכנסות החודש').length).toBeGreaterThan(0)
  })
})

describe('search and filter (2.3)', () => {
  it('filters by note text, type, category and amount range', async () => {
    const user = userEvent.setup()
    seed({
      transactions: [
        makeTransaction({ id: 'a', categoryId: 'food', amountAgorot: 1500, note: 'קפה', date: '2025-01-05' }),
        makeTransaction({ id: 'b', categoryId: 'food', amountAgorot: 40000, note: 'סופר', date: '2026-03-01' }),
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

    await user.selectOptions(screen.getByLabelText('קטגוריה'), 'food')
    await user.type(screen.getByLabelText('מסכום (₪)'), '100')
    expect(screen.getByText('1 תוצאות')).toBeInTheDocument()
    expect(screen.getByText(/סופר/)).toBeInTheDocument()

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
    seed({ transactions: [makeTransaction({ categoryId: 'food', note: 'קפה', date: '2025-01-05' })] })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'חיפוש' }))
    await user.click(screen.getByRole('button', { name: /^עריכת\s*אוכל/ }))
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
    seed({ transactions: [makeTransaction({ categoryId: 'food', date: today })] })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'הגדרות' }))
    await user.click(screen.getByRole('button', { name: 'English' }))

    expect(document.documentElement).toHaveAttribute('dir', 'ltr')
    expect(document.documentElement).toHaveAttribute('lang', 'en')
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Month' }))
    expect(within(screen.getByRole('list', { name: 'Transactions' })).getByText('Food')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: 'עברית' }))
    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
  })
})
