import { useI18n } from '../i18n/i18n'
import { formatILS } from '../lib/money'
import { formatFullDate, formatShortDate } from '../lib/month'
import type { Category, Transaction } from '../lib/types'
import CategoryIcon from './CategoryIcon'
import { focusRing, iconButton } from './ui'

interface TransactionListProps {
  transactions: Transaction[] // already filtered and sorted
  categories: Category[]
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
  label?: string
  emptyText?: string
  showYear?: boolean
}

export default function TransactionList({
  transactions,
  categories,
  onEdit,
  onDelete,
  label,
  emptyText,
  showYear = false,
}: TransactionListProps) {
  const { t, categoryName } = useI18n()

  if (transactions.length === 0) {
    return <p className="py-10 text-center text-muted">{emptyText ?? t('noTransactionsMonth')}</p>
  }

  const categoriesById = new Map(categories.map((c) => [c.id, c]))

  function confirmDelete(transaction: Transaction, name: string) {
    const question = t('confirmDelete', { name, amount: formatILS(transaction.amountAgorot) })
    if (window.confirm(question)) onDelete(transaction.id)
  }

  return (
    <ul aria-label={label ?? t('transactionsLabel')} className="divide-y divide-line rounded-2xl bg-card shadow-sm">
      {transactions.map((tx) => {
        const category = categoriesById.get(tx.categoryId)
        const name = categoryName(category)
        const isIncome = tx.type === 'income'
        const amount = `${isIncome ? '+' : '-'}${formatILS(tx.amountAgorot)}`
        const date = showYear ? formatFullDate(tx.date) : formatShortDate(tx.date)

        return (
          <li key={tx.id} className="flex items-center gap-1 p-2">
            <button
              type="button"
              onClick={() => onEdit(tx)}
              className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-start hover:bg-subtle ${focusRing}`}
            >
              {/* The accessible name is the visible text, prefixed with "Edit" for screen readers */}
              <span className="sr-only">{t('editPrefix')} </span>
              <CategoryIcon category={category} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 font-medium">
                  <span>{name}</span>
                  {tx.recurringId && (
                    <span role="img" aria-label={t('recurringBadge')} title={t('recurringBadge')} className="text-sm">
                      🔁
                    </span>
                  )}
                </span>
                <span className="block truncate text-sm text-muted">
                  {date}
                  {tx.note && ` · ${tx.note}`}
                </span>
              </span>
              <span dir="ltr" className={`font-semibold ${isIncome ? 'text-income' : 'text-expense'}`}>
                {amount}
              </span>
            </button>
            <button
              type="button"
              aria-label={t('deleteTransaction', { name })}
              onClick={() => confirmDelete(tx, name)}
              className={`${iconButton} hover:bg-danger-soft hover:text-expense`}
            >
              ✕
            </button>
          </li>
        )
      })}
    </ul>
  )
}
