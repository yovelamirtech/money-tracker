import { useState, type FormEvent } from 'react'
import { useI18n } from '../i18n/i18n'
import { defaultCategoryFor } from '../lib/categories'
import { createId } from '../lib/id'
import { formatILS, parseAmount } from '../lib/money'
import { todayISO } from '../lib/month'
import type { Category, Settings, Transaction, TransactionType } from '../lib/types'
import SegmentedControl from './SegmentedControl'
import { card, fieldClass, primaryButton, sectionTitle } from './ui'

interface QuickAddProps {
  categories: Category[]
  lastCategoryId: Settings['lastCategoryId']
  onAdd: (transaction: Transaction) => void
}

/** One-line entry on the month screen: amount + category, dated today. */
export default function QuickAdd({ categories, lastCategoryId, onAdd }: QuickAddProps) {
  const { t, categoryName } = useI18n()
  const [type, setType] = useState<TransactionType>('expense')
  const [amountInput, setAmountInput] = useState('')
  const [categoryId, setCategoryId] = useState(() => defaultCategoryFor(categories, 'expense', lastCategoryId))
  const [error, setError] = useState(false)
  const [status, setStatus] = useState('')

  function handleTypeChange(next: TransactionType) {
    setType(next)
    setCategoryId(defaultCategoryFor(categories, next, lastCategoryId))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amountAgorot = parseAmount(amountInput)
    if (amountAgorot === null) {
      setError(true)
      setStatus('')
      return
    }
    onAdd({ id: createId(), type, amountAgorot, categoryId, date: todayISO(), createdAt: new Date().toISOString() })
    const name = categoryName(categories.find((c) => c.id === categoryId))
    setStatus(t('quickAdded', { name, amount: formatILS(amountAgorot) }))
    setAmountInput('')
  }

  return (
    <section aria-labelledby="quick-add-title" className={card}>
      <h2 id="quick-add-title" className={sectionTitle}>
        {t('quickAdd')}
      </h2>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
        <SegmentedControl
          label={t('quickTypeLabel')}
          size="sm"
          value={type}
          onChange={handleTypeChange}
          options={[
            { value: 'expense', label: t('expenseOne') },
            { value: 'income', label: t('incomeOne') },
          ]}
        />
        <select
          aria-label={t('quickCategoryLabel')}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={fieldClass}
        >
          {categories
            .filter((c) => c.type === type)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ` : ''}
                {categoryName(c)}
              </option>
            ))}
        </select>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            dir="ltr"
            autoComplete="off"
            placeholder="₪"
            aria-label={t('quickAmountLabel')}
            aria-invalid={error}
            aria-describedby={error ? 'quick-amount-error' : undefined}
            value={amountInput}
            onChange={(e) => {
              setAmountInput(e.target.value)
              setError(false)
            }}
            className={`${fieldClass} min-w-0 flex-1 text-end ${error ? 'border-expense' : ''}`}
          />
          <button type="submit" className={`${primaryButton} shrink-0`}>
            {t('quickAddButton')}
          </button>
        </div>
        {error && (
          <p id="quick-amount-error" role="alert" className="text-sm text-expense">
            {t('amountError')}
          </p>
        )}
        <p role="status" className="text-sm text-muted empty:hidden">
          {status}
        </p>
      </form>
    </section>
  )
}
