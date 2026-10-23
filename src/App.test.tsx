import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { addMonths, formatMonthLabel, todayISO, toMonthKey } from './lib/month'
import { loadTransactions, saveTransactions } from './lib/storage'

function summaryValue(label: string) {
  return within(screen.getByRole('group', { name: label }))
}

describe('App', () => {
  it('starts on the current month with an empty list', () => {
    render(<App />)

    const currentMonth = toMonthKey(todayISO())
    expect(screen.getByRole('heading', { name: formatMonthLabel(currentMonth) })).toBeInTheDocument()
    expect(screen.getByText('אין תנועות בחודש הזה')).toBeInTheDocument()
    expect(summaryValue('יתרה').getByText('₪0.00')).toBeInTheDocument()
  })

  it('main flow: add expense → in list → totals update → delete → totals update', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)

    // Add an expense
    await user.click(screen.getByRole('button', { name: '+ הוספת תנועה' }))
    await user.type(screen.getByLabelText('סכום (₪)'), '12.50')
    await user.selectOptions(screen.getByLabelText('קטגוריה'), 'תחבורה')
    await user.type(screen.getByLabelText('הערה (לא חובה)'), 'רב-קו')
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    // It appears in the list
    const list = screen.getByRole('list', { name: 'תנועות' })
    expect(within(list).getByText('תחבורה')).toBeInTheDocument()
    expect(within(list).getByText(/רב-קו/)).toBeInTheDocument()

    // Totals update
    expect(summaryValue('הוצאות').getByText('₪12.50')).toBeInTheDocument()
    expect(summaryValue('הכנסות').getByText('₪0.00')).toBeInTheDocument()
    expect(summaryValue('יתרה').getByText('-₪12.50')).toBeInTheDocument()

    // Saved to storage
    expect(loadTransactions()).toHaveLength(1)

    // Delete it (after confirming)
    await user.click(screen.getByRole('button', { name: 'מחיקת תחבורה' }))
    expect(confirmSpy).toHaveBeenCalledOnce()

    // Totals update again
    expect(screen.queryByRole('list', { name: 'תנועות' })).not.toBeInTheDocument()
    expect(summaryValue('הוצאות').getByText('₪0.00')).toBeInTheDocument()
    expect(summaryValue('יתרה').getByText('₪0.00')).toBeInTheDocument()
    expect(loadTransactions()).toEqual([])

    confirmSpy.mockRestore()
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

    await user.click(screen.getByRole('button', { name: 'מחיקת משכורת' }))

    expect(screen.getByRole('list', { name: 'תנועות' })).toBeInTheDocument()
    expect(summaryValue('הכנסות').getByText('₪5,000.00')).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it('shows transactions newest first and moves between months', async () => {
    const user = userEvent.setup()
    saveTransactions([
      { id: '1', type: 'expense', amountAgorot: 1000, categoryId: 'food', date: '2026-03-02', createdAt: '2026-03-02T10:00:00Z' },
      { id: '2', type: 'expense', amountAgorot: 2000, categoryId: 'bills', date: '2026-03-20', createdAt: '2026-03-20T10:00:00Z' },
      { id: '3', type: 'income', amountAgorot: 900000, categoryId: 'salary', date: '2026-04-01', createdAt: '2026-04-01T10:00:00Z' },
    ])
    render(<App />)

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
    expect(items.map((li) => within(li).getByText(/^(אוכל|חשבונות)$/).textContent)).toEqual([
      'חשבונות',
      'אוכל',
    ])
    expect(summaryValue('הוצאות').getByText('₪30.00')).toBeInTheDocument()

    // Next month only has the salary
    await user.click(screen.getByRole('button', { name: 'החודש הבא' }))
    expect(summaryValue('הכנסות').getByText('₪9,000.00')).toBeInTheDocument()
    expect(summaryValue('הוצאות').getByText('₪0.00')).toBeInTheDocument()
  })
})
