import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { addMonths, formatMonthLabel, todayISO, toMonthKey } from './lib/month'
import { loadData, loadTransactions, saveTransactions } from './lib/storage'

function summaryValue(label: string) {
  return within(screen.getByRole('group', { name: label }))
}

describe('App', () => {
  it('starts on the entry screen; the month tab has the summary', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: 'הזנות אחרונות' })).toBeInTheDocument()
    expect(screen.getByLabelText('הזנה חדשה')).toHaveFocus()
    expect(screen.getByText(/עוד לא הזנת כלום/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^מיון/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'חודש' }))
    const currentMonth = toMonthKey(todayISO())
    expect(screen.getByRole('heading', { name: formatMonthLabel(currentMonth) })).toBeInTheDocument()
    expect(screen.getByText('אין תנועות בחודש הזה')).toBeInTheDocument()
    expect(summaryValue('הוצאות').getByText('₪0.00')).toBeInTheDocument()
  })

  it('main flow: type → sent without a category → sort it → the next one is learned → totals', async () => {
    const user = userEvent.setup()
    render(<App />)
    const field = screen.getByLabelText('הזנה חדשה')

    // Type and send: no category yet
    await user.type(field, 'שכ״ד4000{Enter}')
    expect(field).toHaveValue('')
    expect(field).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent('נרשם: שכ״ד ₪4,000.00 · ללא קטגוריה')
    const recent = screen.getByRole('list', { name: 'הזנות אחרונות' })
    expect(within(recent).getByText('שכ״ד')).toBeInTheDocument()
    expect(within(recent).getByText(/ללא קטגוריה/)).toBeInTheDocument()
    expect(loadTransactions()[0]).toMatchObject({ type: 'expense', amountAgorot: 400000, note: 'שכ״ד', categoryId: 'uncategorized' })

    // "משכורת" is income right away
    await user.type(field, 'משכורת 10000')
    await user.click(screen.getByRole('button', { name: 'שליחה' }))
    expect(screen.getByRole('status')).toHaveTextContent('נרשם: משכורת ₪10,000.00 · משכורת')
    expect(loadTransactions()[1]).toMatchObject({ type: 'income', categoryId: 'salary' })

    // Sort the uncategorized one with one tap
    await user.click(screen.getByRole('button', { name: 'מיון 1 ללא קטגוריה' }))
    expect(screen.getByRole('heading', { name: 'מיון לקטגוריות' })).toBeInTheDocument()
    expect(screen.getByText('שכ״ד')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'חשבונות' }))
    expect(screen.getByText('הכול ממוין')).toBeInTheDocument()
    expect(loadTransactions()[0].categoryId).toBe('bills')
    await user.click(screen.getByRole('button', { name: 'חזרה להזנה' }))
    expect(screen.queryByRole('button', { name: /^מיון/ })).not.toBeInTheDocument()

    // Next time the same note gets the category by itself
    await user.type(screen.getByLabelText('הזנה חדשה'), 'שכ"ד 4000{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('· חשבונות')
    expect(loadTransactions()[2]).toMatchObject({ categoryId: 'bills' })

    // Totals on the month tab
    await user.click(screen.getByRole('button', { name: 'חודש' }))
    expect(summaryValue('הוצאות').getByText('₪8,000.00')).toBeInTheDocument()
    expect(summaryValue('הכנסות').getByText('₪10,000.00')).toBeInTheDocument()
    expect(summaryValue('נשאר').getByText('₪2,000.00')).toBeInTheDocument()
  })

  it('fixes the latest entry right away: edit it, or delete it', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)

    await user.type(screen.getByLabelText('הזנה חדשה'), 'קפה 180{Enter}')
    await user.click(screen.getByRole('button', { name: /^עריכת\s*קפה/ }))
    expect(screen.getByRole('heading', { name: 'עריכת תנועה' })).toBeInTheDocument()
    expect(screen.getByLabelText('קטגוריה')).toHaveValue('uncategorized')
    await user.clear(screen.getByLabelText('סכום (₪)'))
    await user.type(screen.getByLabelText('סכום (₪)'), '18')
    await user.selectOptions(screen.getByLabelText('קטגוריה'), 'אוכל בחוץ')
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    // Back on the entry screen, fixed, and the category is learned
    expect(screen.getByRole('heading', { name: 'הזנות אחרונות' })).toBeInTheDocument()
    expect(loadData().transactions[0]).toMatchObject({ amountAgorot: 1800, categoryId: 'eating-out' })
    expect(loadData().noteRules).toEqual([{ note: 'קפה', categoryId: 'eating-out' }])

    await user.click(screen.getByRole('button', { name: 'מחיקת קפה' }))
    expect(confirmSpy).toHaveBeenCalledWith('למחוק את "קפה" בסך ₪18.00?')
    expect(loadTransactions()).toEqual([])
    confirmSpy.mockRestore()
  })

  it('previews the amount and category while typing, newest entry last', async () => {
    const user = userEvent.setup()
    render(<App />)
    const field = screen.getByLabelText('הזנה חדשה')
    expect(screen.getByRole('button', { name: 'שליחה' })).toBeDisabled()

    await user.type(field, '314 דלק')
    expect(screen.getByText('₪314.00 · ללא קטגוריה')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    await user.type(field, '{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('נרשם: דלק ₪314.00 · ללא קטגוריה')

    await user.type(field, 'משכורת 9000')
    expect(screen.getByText('₪9,000.00 · משכורת')).toBeInTheDocument()
    await user.type(field, '{Enter}')

    const rows = within(screen.getByRole('list', { name: 'הזנות אחרונות' })).getAllByRole('listitem')
    expect(rows.map((li) => li.textContent)).toEqual([expect.stringContaining('דלק'), expect.stringContaining('משכורת')])
  })

  it('opening the entry tab goes straight into the field; coming back from an edit does not', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('הזנה חדשה'), 'קפה 18{Enter}')

    await user.click(screen.getByRole('button', { name: 'חודש' }))
    await user.click(screen.getByRole('button', { name: 'הזנה' }))
    expect(screen.getByLabelText('הזנה חדשה')).toHaveFocus()

    await user.click(screen.getByRole('button', { name: /^עריכת\s*קפה/ }))
    await user.click(screen.getByRole('button', { name: 'ביטול' }))
    expect(screen.getByRole('heading', { name: 'הזנות אחרונות' })).toHaveFocus()
  })

  it('keeps the entry bar on the keyboard: --kb and kb-open follow the visual viewport', () => {
    const viewport = Object.assign(new EventTarget(), { height: window.innerHeight, offsetTop: 0 })
    vi.stubGlobal('visualViewport', viewport)
    const { unmount } = render(<App />)
    const html = document.documentElement
    expect(html).not.toHaveClass('kb-open')

    viewport.height = window.innerHeight - 300
    viewport.dispatchEvent(new Event('resize'))
    expect(html).toHaveClass('kb-open')
    expect(html.style.getPropertyValue('--kb')).toBe('300px')

    viewport.height = window.innerHeight
    viewport.dispatchEvent(new Event('resize'))
    expect(html).not.toHaveClass('kb-open')
    unmount()
    vi.unstubAllGlobals()
  })

  it('shows an error for an entry without a valid amount, and saves nothing', async () => {
    const user = userEvent.setup()
    render(<App />)
    const field = screen.getByLabelText('הזנה חדשה')

    await user.type(field, 'קפה{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('חסר סכום')
    expect(field).toHaveValue('קפה')
    expect(field).toHaveAttribute('aria-invalid', 'true')

    await user.type(field, ' 1.234{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('הסכום לא תקין')

    // Typing again clears the error; an empty field can't be sent
    await user.clear(field)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'שליחה' })).toBeDisabled()
    await user.type(field, '{Enter}')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(loadTransactions()).toEqual([])
  })

  it('does not delete when the confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    saveTransactions([
      {
        id: 'x',
        type: 'income',
        amountAgorot: 500000,
        categoryId: 'salary',
        date: todayISO(),
        createdAt: new Date().toISOString(),
      },
    ])
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'חודש' }))

    await user.click(screen.getByRole('button', { name: 'מחיקת משכורת' }))

    expect(screen.getByRole('list', { name: 'תנועות' })).toBeInTheDocument()
    expect(summaryValue('הכנסות').getByText('₪5,000.00')).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it('shows transactions newest first and moves between months', async () => {
    const user = userEvent.setup()
    saveTransactions([
      { id: '1', type: 'expense', amountAgorot: 1000, categoryId: 'groceries', date: '2026-03-02', createdAt: '2026-03-02T10:00:00Z' },
      { id: '2', type: 'expense', amountAgorot: 2000, categoryId: 'bills', date: '2026-03-20', createdAt: '2026-03-20T10:00:00Z' },
      { id: '3', type: 'income', amountAgorot: 900000, categoryId: 'salary', date: '2026-04-01', createdAt: '2026-04-01T10:00:00Z' },
    ])
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'חודש' }))

    // Walk back from the current month to March 2026
    const current = toMonthKey(todayISO())
    let month = current
    while (month !== '2026-03') {
      const goBack = month > '2026-03'
      await user.click(screen.getByRole('button', { name: goBack ? 'החודש הקודם' : 'החודש הבא' }))
      month = addMonths(month, goBack ? -1 : 1)
    }
    expect(screen.getByRole('heading', { name: formatMonthLabel('2026-03') })).toBeInTheDocument()

    const items = within(screen.getByRole('list', { name: 'תנועות' })).getAllByRole('listitem')
    expect(items.map((li) => within(li).getByText(/^(סופר|חשבונות)$/).textContent)).toEqual([
      'חשבונות',
      'סופר',
    ])
    expect(summaryValue('הוצאות').getByText('₪30.00')).toBeInTheDocument()

    // Next month only has the salary
    await user.click(screen.getByRole('button', { name: 'החודש הבא' }))
    expect(summaryValue('הכנסות').getByText('₪9,000.00')).toBeInTheDocument()
    expect(summaryValue('הוצאות').getByText('₪0.00')).toBeInTheDocument()
  })
})
