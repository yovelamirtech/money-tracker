import { useState } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import TransactionList from '../components/TransactionList'
import { fieldClass, secondaryButton } from '../components/ui'
import { useI18n } from '../i18n/i18n'
import { filterTransactions, type TransactionFilter } from '../lib/filter'
import { formatILS, parseAmount } from '../lib/money'
import { sortNewestFirst, summarize } from '../lib/summary'
import type { Category, Transaction, TransactionType } from '../lib/types'

interface SearchScreenProps {
  transactions: Transaction[]
  categories: Category[]
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
}

/** Empty → no limit; a valid amount → agorot; anything else → 'invalid'. */
function parseBound(input: string): number | null | 'invalid' {
  if (input.trim() === '') return null
  return parseAmount(input) ?? 'invalid'
}

export default function SearchScreen({ transactions, categories, onEdit, onDelete }: SearchScreenProps) {
  const { t, categoryName } = useI18n()
  const [text, setText] = useState('')
  const [type, setType] = useState<TransactionType | 'all'>('all')
  const [categoryId, setCategoryId] = useState('')
  const [minInput, setMinInput] = useState('')
  const [maxInput, setMaxInput] = useState('')

  const min = parseBound(minInput)
  const max = parseBound(maxInput)
  const filter: TransactionFilter = {
    text,
    type,
    categoryId,
    minAgorot: min === 'invalid' ? null : min,
    maxAgorot: max === 'invalid' ? null : max,
  }
  const results = sortNewestFirst(filterTransactions(transactions, filter))
  const totals = summarize(results)
  const categoryOptions = categories.filter((c) => type === 'all' || c.type === type)

  function clear() {
    setText('')
    setType('all')
    setCategoryId('')
    setMinInput('')
    setMaxInput('')
  }

  return (
    <main className="flex flex-col gap-4 p-4 pb-24">
      <ScreenHeader title={t('searchTitle')} />

      <form role="search" onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm">
        <label className="flex flex-col gap-1">
          <span className="font-medium">{t('searchText')}</span>
          <input type="search" value={text} onChange={(e) => setText(e.target.value)} className={fieldClass} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-medium">{t('filterType')}</span>
            <select
              value={type}
              onChange={(e) => {
                const next = e.target.value as TransactionType | 'all'
                setType(next)
                // A category of the other type would match nothing.
                if (next !== 'all' && categories.find((c) => c.id === categoryId)?.type !== next) setCategoryId('')
              }}
              className={fieldClass}
            >
              <option value="all">{t('all')}</option>
              <option value="expense">{t('expenses')}</option>
              <option value="income">{t('income')}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium">{t('category')}</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={fieldClass}>
              <option value="">{t('anyCategory')}</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryName(c)}
                  {type === 'all' ? ` (${c.type === 'income' ? t('incomeOne') : t('expenseOne')})` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <AmountBound label={t('minAmount')} value={minInput} onChange={setMinInput} invalid={min === 'invalid'} id="min-amount" />
          <AmountBound label={t('maxAmount')} value={maxInput} onChange={setMaxInput} invalid={max === 'invalid'} id="max-amount" />
        </div>

        <button type="button" onClick={clear} className={secondaryButton}>
          {t('clearFilters')}
        </button>
      </form>

      <div role="status" className="flex flex-wrap justify-between gap-2 text-sm text-muted">
        <span className="font-semibold text-fg">{t('resultsCount', { count: results.length })}</span>
        <span>
          {t('income')} <span dir="ltr">{formatILS(totals.income)}</span> · {t('expenses')}{' '}
          <span dir="ltr">{formatILS(totals.expense)}</span>
        </span>
      </div>

      <TransactionList
        transactions={results}
        categories={categories}
        onEdit={onEdit}
        onDelete={onDelete}
        label={t('resultsLabel')}
        emptyText={t('noResults')}
        showYear
      />
    </main>
  )
}

interface AmountBoundProps {
  id: string
  label: string
  value: string
  invalid: boolean
  onChange: (value: string) => void
}

function AmountBound({ id, label, value, invalid, onChange }: AmountBoundProps) {
  const { t } = useI18n()
  return (
    <label className="flex flex-col gap-1">
      <span className="font-medium">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        dir="ltr"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={`${fieldClass} text-end ${invalid ? 'border-warn' : ''}`}
      />
      {invalid && (
        <span id={`${id}-error`} className="text-sm text-warn">
          {t('invalidAmount')}
        </span>
      )}
    </label>
  )
}
