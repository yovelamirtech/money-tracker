import { useState, type FormEvent } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import SegmentedControl from '../components/SegmentedControl'
import { fieldClass, focusRing, primaryButton, secondaryButton } from '../components/ui'
import { UNCATEGORIZED_ID } from '../data/defaultCategories'
import { useI18n } from '../i18n/i18n'
import { defaultCategoryFor } from '../lib/categories'
import { createId } from '../lib/id'
import { parseAmount, toDecimalString } from '../lib/money'
import { todayISO } from '../lib/month'
import type { Category, Settings, Transaction, TransactionType } from '../lib/types'

export interface SaveOptions {
  repeatMonthly: boolean
}

interface TransactionFormScreenProps {
  categories: Category[]
  /** When set, the form edits this transaction instead of adding a new one. */
  initial?: Transaction
  lastCategoryId?: Settings['lastCategoryId']
  onSave: (transaction: Transaction, options: SaveOptions) => void
  onCancel: () => void
}

export default function TransactionFormScreen({
  categories,
  initial,
  lastCategoryId = {},
  onSave,
  onCancel,
}: TransactionFormScreenProps) {
  const { t, categoryName } = useI18n()
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense')
  const [amountInput, setAmountInput] = useState(initial ? toDecimalString(initial.amountAgorot) : '')
  const [categoryId, setCategoryId] = useState(
    () => initial?.categoryId ?? defaultCategoryFor(categories, 'expense', lastCategoryId),
  )
  const [date, setDate] = useState(() => initial?.date ?? todayISO())
  const [note, setNote] = useState(initial?.note ?? '')
  const [repeatMonthly, setRepeatMonthly] = useState(false)
  const [amountError, setAmountError] = useState(false)

  const categoriesOfType = categories.filter((c) => c.type === type)

  function handleTypeChange(nextType: TransactionType) {
    if (nextType === type) return
    setType(nextType)
    setCategoryId(defaultCategoryFor(categories, nextType, lastCategoryId))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amountAgorot = parseAmount(amountInput)
    if (amountAgorot === null) {
      setAmountError(true)
      return
    }

    const trimmedNote = note.trim()
    const transaction: Transaction = {
      id: initial?.id ?? createId(),
      type,
      amountAgorot,
      categoryId,
      date: date || todayISO(), // the date field can be cleared on some browsers
      ...(trimmedNote && { note: trimmedNote }),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      ...(initial?.recurringId && { recurringId: initial.recurringId }),
    }
    onSave(transaction, { repeatMonthly: !initial && repeatMonthly })
  }

  return (
    <main className="flex flex-col gap-4 p-4">
      <ScreenHeader title={initial ? t('editTransactionTitle') : t('newTransaction')} />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <SegmentedControl
          label={t('transactionType')}
          value={type}
          onChange={handleTypeChange}
          options={[
            { value: 'expense', label: t('expenseOne') },
            { value: 'income', label: t('incomeOne') },
          ]}
        />

        <label className="flex flex-col gap-1">
          <span className="font-medium">{t('amount')}</span>
          <input
            type="text"
            inputMode="decimal"
            dir="ltr"
            autoComplete="off"
            value={amountInput}
            onChange={(e) => {
              setAmountInput(e.target.value)
              setAmountError(false)
            }}
            aria-invalid={amountError}
            aria-describedby={amountError ? 'amount-error' : undefined}
            className={`${fieldClass} text-end ${amountError ? 'border-expense' : ''}`}
            placeholder="0.00"
          />
          {amountError && (
            <span id="amount-error" role="alert" className="text-sm text-expense">
              {t('amountError')}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium">{t('category')}</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={fieldClass}>
            {/* Only an entry that is still uncategorized can stay that way. */}
            {type === 'expense' && initial?.categoryId === UNCATEGORIZED_ID && (
              <option value={UNCATEGORIZED_ID}>{t('uncategorized')}</option>
            )}
            {categoriesOfType.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryName(c)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium">{t('date')}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={fieldClass} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium">{t('note')}</span>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} />
        </label>

        {!initial && (
          <label className="flex min-h-12 items-start gap-3">
            <input
              type="checkbox"
              checked={repeatMonthly}
              onChange={(e) => setRepeatMonthly(e.target.checked)}
              aria-describedby="repeat-hint"
              className={`mt-1 size-6 shrink-0 accent-accent ${focusRing}`}
            />
            <span>
              <span className="font-medium">{t('repeatMonthly')}</span>
              <span id="repeat-hint" className="block text-sm text-muted">
                {t('repeatMonthlyHint')}
              </span>
            </span>
          </label>
        )}

        <div className="mt-2 grid grid-cols-2 gap-3">
          <button type="submit" className={`${primaryButton} min-h-14`}>
            {t('save')}
          </button>
          <button type="button" onClick={onCancel} className={`${secondaryButton} min-h-14`}>
            {t('cancel')}
          </button>
        </div>
      </form>
    </main>
  )
}
