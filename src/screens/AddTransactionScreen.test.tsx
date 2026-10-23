import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { defaultCategories } from '../data/defaultCategories'
import { todayISO } from '../lib/month'
import AddTransactionScreen from './AddTransactionScreen'

function renderForm() {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  render(<AddTransactionScreen categories={defaultCategories} onSave={onSave} onCancel={onCancel} />)
  return { onSave, onCancel, user: userEvent.setup() }
}

function categoryOptions() {
  return within(screen.getByLabelText('קטגוריה'))
    .getAllByRole('option')
    .map((o) => o.textContent)
}

describe('AddTransactionScreen', () => {
  it('starts as an expense, dated today', () => {
    renderForm()
    expect(screen.getByRole('button', { name: 'הוצאה' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('תאריך')).toHaveValue(todayISO())
  })

  it('shows only the categories of the selected type', async () => {
    const { user } = renderForm()
    expect(categoryOptions()).toContain('אוכל')
    expect(categoryOptions()).not.toContain('משכורת')

    await user.click(screen.getByRole('button', { name: 'הכנסה' }))

    expect(categoryOptions()).toEqual(['משכורת', 'אחר'])
  })

  it.each([[''], ['abc'], ['0'], ['-5'], ['12.345']])(
    'shows an error and does not save for invalid amount "%s"',
    async (amount) => {
      const { user, onSave } = renderForm()
      if (amount) await user.type(screen.getByLabelText('סכום (₪)'), amount)
      await user.click(screen.getByRole('button', { name: 'שמירה' }))

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
    },
  )

  it('saves a valid income with amount in agorot and the chosen fields', async () => {
    const { user, onSave } = renderForm()

    await user.click(screen.getByRole('button', { name: 'הכנסה' }))
    await user.type(screen.getByLabelText('סכום (₪)'), '1,200')
    await user.clear(screen.getByLabelText('תאריך'))
    await user.type(screen.getByLabelText('תאריך'), '2026-10-01')
    await user.type(screen.getByLabelText('הערה (לא חובה)'), '  בונוס  ')
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(onSave).toHaveBeenCalledOnce()
    expect(onSave.mock.calls[0][0]).toMatchObject({
      type: 'income',
      amountAgorot: 120000,
      categoryId: 'salary',
      date: '2026-10-01',
      note: 'בונוס',
    })
  })

  it('leaves out an empty note', async () => {
    const { user, onSave } = renderForm()
    await user.type(screen.getByLabelText('סכום (₪)'), '5')
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(onSave.mock.calls[0][0]).not.toHaveProperty('note')
  })

  it('calls onCancel', async () => {
    const { user, onCancel, onSave } = renderForm()
    await user.click(screen.getByRole('button', { name: 'ביטול' }))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })
})
